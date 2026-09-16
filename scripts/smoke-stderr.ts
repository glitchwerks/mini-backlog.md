const BUN_MACOS_AVX_WARNING =
	/^warn: CPU lacks AVX support, strange crashes may occur\. Reinstall Bun or use \*-baseline build:\r?\n {2}https:\/\/github\.com\/oven-sh\/bun\/releases\/download\/bun-v\d+\.\d+\.\d+\/bun-darwin-x64-baseline\.zip\r?\n/;

export function removeKnownBunRuntimeWarning(stderr: string): string {
	return stderr.replace(BUN_MACOS_AVX_WARNING, "");
}
