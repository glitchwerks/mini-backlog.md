import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { removeKnownBunRuntimeWarning } from "./smoke-stderr.ts";

const [executablePath, expectedVersion] = process.argv.slice(2);
if (!executablePath || !expectedVersion) {
	throw new Error("Usage: bun scripts/smoke-compiled-build.ts <executable-path> <expected-version>");
}
const executable = resolve(executablePath);
const exec = promisify(execFile);
const timeout = 16000;
const smokeRoot = await mkdtemp(join(tmpdir(), "mini-backlog-smoke-"));

/** Exercise the installed executable, including Nix's Bun wrapper, with bounded subprocesses. */
async function run(...args: string[]): Promise<string> {
	const result = await exec(executable, args, { cwd: smokeRoot, timeout });
	assert.equal(removeKnownBunRuntimeWarning(result.stderr), "");
	return result.stdout;
}

try {
	const help = await run("--help");
	assert.match(help, /mini-backlog\.md/);
	assert.deepEqual(
		help
			.split("Commands:\n")[1]
			?.trim()
			.split("\n")
			.map((line) => line.trim().split(/\s/)[0])
			.sort(),
		["doc", "mcp", "milestone", "search", "task"],
	);
	assert.equal((await run("--version")).trim(), expectedVersion);
	for (const args of [
		["init"],
		["browser"],
		["board"],
		["help"],
		["--plain"],
		["task", "archive", "TASK-1"],
		["milestone", "archive", "m-0"],
	]) {
		await assert.rejects(exec(executable, args, { cwd: smokeRoot, timeout }), (error: unknown) => {
			const failure = error as { code?: number; stderr?: string };
			return failure.code === 1 && Boolean(failure.stderr?.includes("error:"));
		});
	}
	// Mini intentionally has no initializer. Seed the durable project format directly.
	for (const directory of ["tasks", "drafts", "completed", "docs", "milestones"]) {
		await mkdir(join(smokeRoot, "backlog", directory), { recursive: true });
	}
	await Bun.write(
		join(smokeRoot, "backlog/config.yml"),
		'project_name: "Compiled smoke"\nstatuses: ["To Do", "In Progress", "Done"]\ndefault_status: "To Do"\nlabels: []\nfilesystem_only: true\nremote_operations: false\ncheck_active_branches: false\n',
	);
	await run("task", "create", "Smoke task");
	const list = JSON.parse(await run("task", "list", "--json"));
	assert.equal(list.tasks.length, 1);
	const id = list.tasks[0].id;
	await run("task", "edit", id, "--description", "Updated smoke task");
	const detail = JSON.parse(await run("task", "view", id, "--json")).task;
	assert.equal(detail.description, "Updated smoke task");
	assert.equal(Object.hasOwn(detail, "filePath"), false);
	await run("milestone", "add", "Smoke milestone", "--description", "Visible description");
	const renamed = await run("milestone", "rename", "m-0", "Renamed milestone");
	assert.doesNotMatch(renamed, /milestone file|backlog[\\/]milestones/);
	await run("milestone", "remove", "m-0");
	await run("task", "edit", id, "--status", "Done");
	await run("task", "complete", id);

	const transport = new StdioClientTransport({
		command: executable,
		args: ["mcp", "start", "--cwd", smokeRoot],
		cwd: smokeRoot,
		stderr: "pipe",
	});
	const client = new Client({ name: "Mini artifact smoke", version: "1.0.0" }, { capabilities: {} });
	try {
		await client.connect(transport, { timeout });
		const tools = await client.listTools(undefined, { timeout });
		assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
			"document_create",
			"document_list",
			"document_search",
			"document_update",
			"document_view",
			"milestone_add",
			"milestone_list",
			"milestone_remove",
			"milestone_rename",
			"task_complete",
			"task_create",
			"task_edit",
			"task_list",
			"task_search",
			"task_view",
		]);
		assert.deepEqual((await client.listResources(undefined, { timeout })).resources, []);
		assert.deepEqual((await client.listResourceTemplates(undefined, { timeout })).resourceTemplates, []);
		assert.deepEqual((await client.listPrompts(undefined, { timeout })).prompts, []);
		await assert.rejects(
			client.callTool({ name: "task_archive", arguments: { id } }, undefined, { timeout }),
			/Tool not found/,
		);
		const document = await client.callTool(
			{ name: "document_create", arguments: { title: "Smoke document", content: "Persisted content" } },
			undefined,
			{ timeout },
		);
		assert.notEqual(document.isError, true);
	} finally {
		await client.close();
	}
} finally {
	await rm(smokeRoot, { recursive: true, force: true, maxRetries: 3 });
}

console.log(`Compiled build smoke checks passed for ${executable}.`);
