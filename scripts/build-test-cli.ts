import tailwind from "bun-plugin-tailwind";

// Internal regression harness only: never called by the production or release build.
const outdir = process.env.BACKLOG_BUILD_OUTDIR;
if (!outdir) throw new Error("BACKLOG_BUILD_OUTDIR is required for the unshipped test bundle.");
const { version } = await Bun.file("package.json").json();
await Bun.build({
	entrypoints: ["src/test/full-cli-entry.ts"],
	root: "src",
	outdir,
	target: "bun",
	minify: true,
	naming: { entry: "[name].[ext]" },
	define: {
		__EMBEDDED_VERSION__: JSON.stringify(version),
		"process.env.BACKLOG_TEST_BUNDLED": JSON.stringify("true"),
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	plugins: [tailwind],
});
