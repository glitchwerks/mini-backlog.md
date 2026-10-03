if (process.env.BACKLOG_TEST_BUNDLED === "true") {
	process.env.BACKLOG_BUNDLE_ASSET_DIR ??= import.meta.dir;
}

const { runCli } = await import("../cli.ts");
await runCli(process.argv, "full");
