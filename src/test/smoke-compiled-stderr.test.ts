import { describe, expect, it } from "bun:test";
import { removeKnownBunRuntimeWarning } from "../../scripts/smoke-stderr.ts";

const warning =
	"warn: CPU lacks AVX support, strange crashes may occur. Reinstall Bun or use *-baseline build:\n" +
	"  https://github.com/oven-sh/bun/releases/download/bun-v1.3.14/bun-darwin-x64-baseline.zip\n";

describe("compiled smoke stderr filtering", () => {
	it("removes only Bun's known macOS AVX warning", () => {
		expect(removeKnownBunRuntimeWarning(warning)).toBe("");
	});

	it("preserves unexpected stderr after the known warning", () => {
		expect(removeKnownBunRuntimeWarning(`${warning}unexpected failure\n`)).toBe("unexpected failure\n");
	});

	it("preserves similar but unknown warnings", () => {
		expect(removeKnownBunRuntimeWarning(warning.replace("darwin-x64", "linux-x64"))).not.toBe("");
	});
});
