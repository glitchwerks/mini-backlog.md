import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
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

/** Let the OS allocate a loopback port, releasing it immediately before launch. */
async function findAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			server.close((error) => {
				if (error) reject(error);
				else if (address && typeof address !== "string") resolve(address.port);
				else reject(new Error("Unable to allocate a browser smoke port"));
			});
		});
	});
}

/** Bound shutdown even if the child ignores graceful termination. */
async function waitForExit(exited: Promise<void>, milliseconds: number): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			exited.then(() => true),
			new Promise<boolean>((resolve) => {
				timer = setTimeout(() => resolve(false), milliseconds);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Prove the shipped browser policy, HTTP server, and embedded page work together. */
async function verifyBrowser(): Promise<void> {
	const port = await findAvailablePort();
	const origin = `http://127.0.0.1:${port}`;
	const child = spawn(executable, ["browser", "--port", String(port), "--no-open"], {
		cwd: smokeRoot,
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});
	let stderr = "";
	let spawnError: Error | undefined;
	let closed = false;
	child.stdout.resume();
	child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
		stderr = (stderr + chunk).slice(-8000);
	});
	child.once("error", (error) => {
		spawnError = error;
	});
	const exited = new Promise<void>((resolve) => {
		child.once("close", () => {
			closed = true;
			resolve();
		});
	});
	try {
		const deadline = Date.now() + 8000;
		while (true) {
			if (spawnError) throw spawnError;
			assert.equal(closed, false, `Browser exited before readiness (code ${child.exitCode})`);
			try {
				const response = await fetch(`${origin}/api/status`, { signal: AbortSignal.timeout(500) });
				assert.equal(response.ok, true);
				await response.arrayBuffer();
				break;
			} catch (error) {
				if (Date.now() >= deadline) throw new Error("Browser readiness deadline exceeded", { cause: error });
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
		const page = await fetch(`${origin}/`, { signal: AbortSignal.timeout(1000) });
		assert.equal(page.ok, true);
		assert.match(await page.text(), /<div id="root">/);
	} catch (error) {
		throw new Error(`Compiled browser smoke failed at ${origin}\nstderr: ${stderr || "(empty)"}`, { cause: error });
	} finally {
		if (!closed) child.kill("SIGTERM");
		if (!(await waitForExit(exited, 1500))) {
			child.kill("SIGKILL");
			assert.equal(await waitForExit(exited, 1500), true, `Browser process ${child.pid} did not exit`);
		}
	}
	console.log("Compiled browser smoke checks passed (HTTP status, embedded page, process cleanup).");
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
		["browser", "doc", "mcp", "milestone", "search", "task"],
	);
	assert.equal((await run("--version")).trim(), expectedVersion);
	for (const args of [
		["init"],
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
	await verifyBrowser();

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
