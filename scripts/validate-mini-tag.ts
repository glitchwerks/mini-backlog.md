const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json();
const actual = Bun.argv[2] ?? "";
const expected = `mini-v${manifest.version}`;

if (actual !== expected) {
	console.error(`Invalid mini-backlog.md source tag: ${actual || "<missing>"}. Expected ${expected}.`);
	process.exit(1);
}

console.log(`Validated mini-backlog.md source tag ${actual}.`);
