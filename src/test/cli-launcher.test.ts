import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSignalExitCode, isArchitectureSignal, isBinaryInstallError } = require("../../scripts/cli.cjs");

const isWindows = process.platform === "win32";
const scriptsDir = join(import.meta.dir, "..", "..", "scripts");
const tempDirs: string[] = [];

async function createLauncherCheckout(
	options: { localBuild?: boolean; platformPackage?: boolean } = {},
): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "mini-backlog-launcher-"));
	tempDirs.push(root);
	await mkdir(join(root, "scripts"), { recursive: true });
	await copyFile(join(scriptsDir, "cli.cjs"), join(root, "scripts", "cli.cjs"));
	await writeFile(join(root, "package.json"), "{}");

	if (options.localBuild) {
		await mkdir(join(root, "dist"), { recursive: true });
		const binary = join(root, "dist", isWindows ? "backlog.exe" : "backlog");
		await copyFile(process.execPath, binary);
		await chmod(binary, 0o755);
	}

	if (options.platformPackage) {
		const platform = process.platform === "win32" ? "windows" : process.platform;
		const packageDir = join(root, "node_modules", `mini-backlog.md-${platform}-${process.arch}`);
		await mkdir(packageDir, { recursive: true });
		await writeFile(
			join(packageDir, "package.json"),
			JSON.stringify({ repository: { url: "git+https://github.com/glitchwerks/mini-backlog.md.git" } }),
		);
		await writeFile(join(packageDir, isWindows ? "backlog.exe" : "backlog"), "registry artifact");
	}

	return root;
}

function runLauncher(root: string, args: string[] = []) {
	return spawnSync("node", [join(root, "scripts", "cli.cjs"), ...args], { encoding: "utf8" });
}

afterAll(async () => {
	await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("source-build CLI launcher", () => {
	it("ignores registry platform packages when the local source build is missing", async () => {
		const root = await createLauncherCheckout({ platformPackage: true });
		const result = runLauncher(root, ["--version"]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Source build not found at");
		expect(result.stderr).toContain("Build and install mini-backlog.md from source");
		expect(result.stderr).not.toContain("Tried packages:");
		expect(result.stderr).not.toContain("Binary package not installed");
	});

	it("launches only the binary built beside the source checkout", async () => {
		const root = await createLauncherCheckout({ localBuild: true });
		const result = runLauncher(root, ["--version"]);

		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe(Bun.version);
	});
});

describe("launcher error and signal mapping", () => {
	it("matches missing and wrong-architecture spawn failures", () => {
		expect(isBinaryInstallError({ errno: -86, code: "Unknown system error -86" })).toBe(true);
		expect(isBinaryInstallError({ code: "EBADARCH" })).toBe(true);
		expect(isBinaryInstallError({ code: "ENOEXEC", errno: -8 })).toBe(true);
		expect(isBinaryInstallError({ code: "ENOENT", errno: -2 })).toBe(true);
	});

	it("does not match unrelated spawn failures", () => {
		expect(isBinaryInstallError({ code: "EACCES", errno: -13 })).toBe(false);
		expect(isBinaryInstallError({})).toBe(false);
	});

	it("classifies architecture signals", () => {
		expect(isArchitectureSignal("SIGILL")).toBe(true);
		expect(isArchitectureSignal("SIGTRAP")).toBe(true);
		expect(isArchitectureSignal("SIGTERM")).toBe(false);
	});

	it.skipIf(isWindows)("maps Unix signals to conventional process exit codes", () => {
		expect(getSignalExitCode("SIGTERM")).toBe(128 + 15);
		expect(getSignalExitCode("UNKNOWN")).toBe(1);
	});
});
