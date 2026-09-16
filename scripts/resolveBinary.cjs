const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { basename, dirname, join } = require("node:path");

function getPackageName(platform = process.platform, arch = process.arch) {
	return `mini-backlog.md-${platform === "win32" ? "windows" : platform}-${arch}`;
}

/**
 * Package names to try, in order. On macOS both darwin variants are candidates
 * because the OS can run whichever one is actually installed (natively or via
 * Rosetta 2). A Rosetta-translated process reports x64 while the hardware is
 * arm64, so under Rosetta the arm64 (hardware) package comes first.
 */
function getCandidatePackageNames(
	platform = process.platform,
	arch = process.arch,
	rosetta = isRosettaTranslated(platform),
) {
	if (platform !== "darwin" || (arch !== "arm64" && arch !== "x64")) {
		return [getPackageName(platform, arch)];
	}
	const primary = rosetta ? "arm64" : arch;
	return [getPackageName(platform, primary), getPackageName(platform, primary === "arm64" ? "x64" : "arm64")];
}

/**
 * True when the current process runs under Rosetta 2 translation on macOS.
 * stdio ignores the child's stdin and stderr so restricted shells, where sysctl
 * is not permitted, cannot leak "Operation not permitted" into our own stderr.
 */
function isRosettaTranslated(platform = process.platform, exec = execFileSync) {
	if (platform !== "darwin") return false;
	try {
		return (
			exec("/usr/sbin/sysctl", ["-in", "sysctl.proc_translated"], {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim() === "1"
		);
	} catch {
		return false;
	}
}

function resolveBinaryPath(platform = process.platform, arch = process.arch, resolver = require.resolve) {
	const binary = `backlog${platform === "win32" ? ".exe" : ""}`;
	let firstError;
	for (const packageName of getCandidatePackageNames(platform, arch)) {
		try {
			return resolver(`${packageName}/${binary}`);
		} catch (error) {
			firstError ??= error;
		}
	}
	throw firstError;
}

/** Resolve this checkout's build or a platform artifact carrying the fork's repository identity. */
function resolveMiniBinaryPath() {
	const binary = `backlog${process.platform === "win32" ? ".exe" : ""}`;
	const localBinary =
		basename(__dirname) === "scripts" ? join(__dirname, "..", "dist", binary) : join(__dirname, binary);
	if (existsSync(localBinary)) return localBinary;
	return resolveBinaryPath(process.platform, process.arch, (specifier) => {
		const path = require.resolve(specifier);
		const manifest = JSON.parse(readFileSync(join(dirname(path), "package.json"), "utf8"));
		if (
			!/^(git\+)?https:\/\/github\.com\/glitchwerks\/mini-backlog\.md(\.git)?$/.test(manifest.repository?.url ?? "")
		) {
			throw new Error("Platform binary does not belong to mini-backlog.md.");
		}
		return path;
	});
}

module.exports = {
	getPackageName,
	getCandidatePackageNames,
	isRosettaTranslated,
	resolveBinaryPath,
	resolveMiniBinaryPath,
};
