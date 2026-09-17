#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { constants: osConstants } = require("node:os");
const { join } = require("node:path");

function printInstallHelp() {
	console.error(`Detected: ${process.platform}-${process.arch} (Node ${process.version})`);
	console.error("Build and install mini-backlog.md from source:");
	console.error("https://github.com/glitchwerks/mini-backlog.md#install-from-this-fork");
	console.error("From the fork checkout:");
	console.error("  bun install --frozen-lockfile");
	console.error("  bun run build");
	console.error("Then: npm install --global --omit=optional --ignore-scripts .");
}

/**
 * Spawn/exec failures that indicate a missing or wrong-architecture binary.
 * macOS reports a wrong-arch Mach-O as EBADARCH (errno 86), which libuv has no
 * name for, so it surfaces as errno -86 ("Unknown system error -86").
 */
function isBinaryInstallError(error) {
	return error?.errno === -86 || error?.code === "EBADARCH" || error?.code === "ENOEXEC" || error?.code === "ENOENT";
}

function isArchitectureSignal(signal) {
	return signal === "SIGILL" || signal === "SIGTRAP";
}

function getSignalExitCode(signal) {
	const signalNumber = osConstants.signals[signal];
	return signalNumber ? 128 + signalNumber : 1;
}

function handleSpawnError(binaryPath, error) {
	if (isBinaryInstallError(error)) {
		console.error(`Cannot execute ${binaryPath} (${error.code ?? error.errno}).`);
		console.error("The binary is missing or was built for a different CPU architecture.");
		printInstallHelp();
	} else {
		console.error("Failed to start backlog:", error);
	}
	process.exit(1);
}

function main() {
	const binary = `backlog${process.platform === "win32" ? ".exe" : ""}`;
	const binaryPath = join(__dirname, "..", "dist", binary);
	if (!existsSync(binaryPath)) {
		console.error(`Source build not found at ${binaryPath}.`);
		printInstallHelp();
		process.exit(1);
	}

	// Clean up unexpected args some global shims pass (e.g. bun) like the binary path itself
	const rawArgs = process.argv.slice(2);
	const cleanedArgs = rawArgs.filter((arg) => arg !== binaryPath);

	// Spawn failures can surface as a synchronous throw (e.g. ENOEXEC) or as an 'error' event
	let child;
	try {
		child = spawn(binaryPath, cleanedArgs, {
			stdio: "inherit",
			windowsHide: true,
		});
	} catch (error) {
		handleSpawnError(binaryPath, error);
		return;
	}

	child.on("exit", (code, signal) => {
		if (isArchitectureSignal(signal)) {
			// Typical symptom of running a binary built for the other CPU architecture
			console.error(`\nbacklog crashed with ${signal} (illegal instruction): ${binaryPath}`);
			console.error("The installed binary was likely built for a different CPU architecture.");
			printInstallHelp();
			process.exit(1);
		}
		if (signal) {
			process.exit(getSignalExitCode(signal));
		}
		process.exit(code ?? 1);
	});

	child.on("error", (error) => handleSpawnError(binaryPath, error));
}

if (require.main === module) main();

module.exports = { getSignalExitCode, isArchitectureSignal, isBinaryInstallError };
