import { afterEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { $ } from "bun";
import { createMcpServer, McpServer } from "../mcp/server.ts";
import { MINI_MCP_TOOL_NAMES } from "../mini/surface-policy.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const MINI_CLI_PATH = join(process.cwd(), "src", "cli.ts");
let TEST_DIR = "";

function getText(content: unknown[] | undefined): string {
	const item = content?.[0] as { text?: string } | undefined;
	return item?.text ?? "";
}

async function createProject(projectRoot: string): Promise<void> {
	await $`mkdir -p ${projectRoot}`.quiet();
	const bootstrap = new McpServer(projectRoot, "Bootstrap");
	await bootstrap.filesystem.ensureBacklogStructure();
	await initializeFilesystemTestProject(bootstrap, "Mini MCP Test Project");
	await bootstrap.stop();
}

async function connectClient(server: McpServer, rootsRef: { current: string[] }): Promise<Client> {
	const client = new Client(
		{ name: "Mini MCP Test Client", version: "1.0.0" },
		{ capabilities: { roots: { listChanged: true } } },
	);
	client.setRequestHandler(ListRootsRequestSchema, async () => ({
		roots: rootsRef.current.map((uri) => ({ uri })),
	}));
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await server.getServer().connect(serverTransport);
	await client.connect(clientTransport);
	return client;
}

afterEach(async () => {
	if (TEST_DIR) await safeCleanup(TEST_DIR);
	TEST_DIR = "";
});

describe("mini MCP surface", () => {
	it("advertises only the exact approved project surface", async () => {
		TEST_DIR = createUniqueTestDir("mini-mcp-surface");
		await createProject(TEST_DIR);
		const server = await createMcpServer(TEST_DIR, { surface: "mini" });

		try {
			const tools = await server.testInterface.listTools();
			expect(tools.tools.map((tool) => tool.name).sort()).toEqual([...MINI_MCP_TOOL_NAMES].sort());
			const keysByTool = Object.fromEntries(
				tools.tools.map((tool) => [
					tool.name,
					Object.keys((tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {}).sort(),
				]),
			);
			expect(keysByTool.document_list).toEqual(["search"]);
			expect(keysByTool.document_search).toEqual(["limit", "query"]);
			expect(keysByTool.document_view).toEqual(["id"]);
			expect(keysByTool.document_create).toEqual(["content", "path", "tags", "title", "type"]);
			expect(keysByTool.document_update).toEqual(["content", "id", "path", "tags", "title", "type"]);
			expect(keysByTool.milestone_list).toEqual([]);
			expect(keysByTool.milestone_add).toEqual(["description", "name"]);
			expect(keysByTool.milestone_rename).toEqual(["from", "to", "updateTasks"]);
			expect(keysByTool.milestone_remove).toEqual(["name", "reassignTo", "taskHandling"]);
			expect((await server.testInterface.listResources()).resources).toEqual([]);
			expect((await server.testInterface.listResourceTemplates()).resourceTemplates).toEqual([]);
			expect((await server.testInterface.listPrompts()).prompts).toEqual([]);

			await expect(
				server.testInterface.callTool({ params: { name: "task_archive", arguments: { id: "TASK-1" } } }),
			).rejects.toThrow("Tool not found");
			await expect(
				server.testInterface.callTool({ params: { name: "get_backlog_instructions", arguments: {} } }),
			).rejects.toThrow("Tool not found");
		} finally {
			await server.stop();
		}
	});

	it("returns active milestone descriptions without due-date or archive output", async () => {
		TEST_DIR = createUniqueTestDir("mini-mcp-milestones");
		await createProject(TEST_DIR);
		const seed = new McpServer(TEST_DIR, "Seed");
		await seed.filesystem.createMilestone("Dated release", "Visible description", "2026-09-30");
		await seed.stop();

		const server = await createMcpServer(TEST_DIR, { surface: "mini" });
		try {
			const listed = await server.testInterface.callTool({ params: { name: "milestone_list", arguments: {} } });
			const listText = getText(listed.content);
			expect(listText).toContain("m-0: Dated release");
			expect(listText).toContain("Visible description");
			expect(listText.toLowerCase()).not.toContain("due");
			expect(listText).not.toContain("Archived milestone values");
			expect(listText).not.toContain("milestone_archive");

			const renamed = await server.testInterface.callTool({
				params: { name: "milestone_rename", arguments: { from: "m-0", to: "Renamed release" } },
			});
			expect(getText(renamed.content).toLowerCase()).not.toContain("due");
		} finally {
			await server.stop();
		}
	});

	it("prints active milestone descriptions without due dates in the shipped CLI", async () => {
		TEST_DIR = createUniqueTestDir("mini-cli-milestones");
		await createProject(TEST_DIR);
		const seed = new McpServer(TEST_DIR, "Seed");
		await seed.filesystem.createMilestone("Dated release", "Visible description", "2026-09-30");
		await seed.stop();

		const result = await $`bun ${MINI_CLI_PATH} milestone list --plain`.cwd(TEST_DIR).quiet().nothrow();
		const output = result.stdout.toString();
		expect(result.exitCode).toBe(0);
		expect(output).toContain("m-0: Dated release");
		expect(output).toContain("Visible description");
		expect(output.toLowerCase()).not.toContain("due");
	});

	it("starts empty without a project and roots-upgrades to the same exact approved surface", async () => {
		TEST_DIR = createUniqueTestDir("mini-mcp-roots");
		const uninitializedDir = join(TEST_DIR, "uninitialized");
		const projectRoot = join(TEST_DIR, "project");
		await $`mkdir -p ${uninitializedDir}`.quiet();
		await createProject(projectRoot);

		const server = await createMcpServer(uninitializedDir, { surface: "mini" });
		expect((await server.testInterface.listTools()).tools).toEqual([]);
		expect((await server.testInterface.listResources()).resources).toEqual([]);

		const rootsRef = { current: [pathToFileURL(projectRoot).toString()] };
		const client = await connectClient(server, rootsRef);
		try {
			expect(client.getInstructions()).toBe(
				"Use the available task, document, and milestone tools to manage work in this Backlog.md project.",
			);
			expect(client.getInstructions()?.toLowerCase()).not.toMatch(/resource|initializ/);
			const tools = await client.listTools();
			expect(tools.tools.map((tool) => tool.name).sort()).toEqual([...MINI_MCP_TOOL_NAMES].sort());
			expect((await client.listResources()).resources).toEqual([]);
			expect((await client.listResourceTemplates()).resourceTemplates).toEqual([]);
			expect((await client.listPrompts()).prompts).toEqual([]);

			rootsRef.current = [pathToFileURL(uninitializedDir).toString()];
			await client.sendRootsListChanged();
			expect((await client.listTools()).tools).toEqual([]);
			expect((await client.listResources()).resources).toEqual([]);
		} finally {
			await client.close();
			await server.stop();
		}
	});
});
