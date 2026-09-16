import { expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dir, "../..");

it("CI builds an unshipped full regression bundle independently of the production mini bundle", async () => {
	const workflow = Bun.YAML.parse(await Bun.file(join(root, ".github/workflows/ci.yml")).text()) as {
		jobs: { test: { steps: { name?: string; run?: string; env?: Record<string, string> }[] } };
	};
	const buildStep = workflow.jobs.test.steps.find((step) => step.name === "Bundle CLI for integration tests");
	const script = buildStep?.run?.match(/bun (scripts\/[^\s]+)/)?.[1];
	if (!script) throw new Error("Missing CI bundle command");
	await mkdir(join(root, ".tmp"), { recursive: true });
	const dir = await mkdtemp(join(root, ".tmp/mini-routing-"));
	try {
		const full = join(dir, "full");
		const mini = join(dir, "mini");
		await exec(process.execPath, [script], {
			cwd: root,
			env: { ...process.env, BACKLOG_BUILD_OUTDIR: full },
			timeout: 60000,
		});
		const consumerPath = workflow.jobs.test.steps.find((step) => step.name === "Run tests")?.env
			?.BACKLOG_TEST_CLI_BUNDLE;
		if (!consumerPath) throw new Error("Missing regression bundle routing");
		const fullEntry = join(full, basename(consumerPath));
		const fullHelp = await exec(process.execPath, [fullEntry, "--help"]);
		expect(fullHelp.stdout).toContain("init");
		expect(fullHelp.stdout).toContain("browser");
		await exec(process.execPath, ["scripts/build.ts"], {
			cwd: root,
			env: { ...process.env, BACKLOG_BUILD_OUTDIR: mini },
			timeout: 60000,
		});
		const miniHelp = await exec(process.execPath, [join(mini, "cli.js"), "--help"]);
		expect(miniHelp.stdout).toContain("mini-backlog.md");
		expect(miniHelp.stdout).not.toMatch(/^ {2}(init|browser|help)\b/m);
		const regression = await exec(
			process.execPath,
			["test", "--timeout=10000", "src/test/no-remote-preflight.test.ts"],
			{ cwd: root, env: { ...process.env, BACKLOG_TEST_CLI_BUNDLE: fullEntry }, timeout: 30000 },
		);
		expect(regression.stderr).toContain("0 fail");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}, 120000);
