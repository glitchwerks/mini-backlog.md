const { readFileSync, writeFileSync } = require("node:fs");

const [kind, output, version, name, os, cpu] = process.argv.slice(2);
if (!output || !version || !["root", "platform"].includes(kind)) {
	throw new Error("Usage: node scripts/release-manifest.cjs <root|platform> <output> <version> [name os cpu]");
}
const source = JSON.parse(readFileSync("package.json", "utf8"));
let manifest;
if (kind === "root") {
	const { devDependencies, scripts, type, module, ...metadata } = source;
	manifest = {
		...metadata,
		version,
		bin: { backlog: "cli.js" },
		files: ["cli.js", "resolveBinary.cjs", "postuninstall.cjs", "package.json", "README.md", "LICENSE"],
		scripts: { postuninstall: "node postuninstall.cjs" },
		optionalDependencies: Object.fromEntries(
			["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "windows-arm64", "windows-x64"].map((platform) => [
				`mini-backlog.md-${platform}`,
				version,
			]),
		),
	};
} else {
	if (!name || !os || !cpu) throw new Error("Platform manifests require name, os, and cpu.");
	manifest = {
		name,
		version,
		os: [os],
		cpu: [cpu],
		files: [`backlog${os === "win32" ? ".exe" : ""}`, "package.json", "LICENSE"],
		repository: source.repository,
	};
}
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
