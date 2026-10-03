import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

export interface ObservedField {
	path: string;
	types: string[];
	optional: boolean;
}

/** Observed presence is relative to object instances, including objects inside arrays. */
export function observeShape(samples: unknown[]): ObservedField[] {
	const nodes = new Map<string, { types: Set<string>; seen: number; objects: number; parent?: string }>();
	function visit(value: unknown, path: string, parent?: string): void {
		const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
		if (!["null", "array", "object", "string", "boolean", "number"].includes(type)) {
			throw new Error(`Non-JSON response at ${path}.`);
		}
		const node = nodes.get(path) ?? { types: new Set<string>(), seen: 0, objects: 0, parent };
		node.types.add(type);
		node.seen++;
		nodes.set(path, node);
		if (Array.isArray(value)) {
			for (const item of value) visit(item, `${path}/*`);
		} else if (value !== null && typeof value === "object") {
			node.objects++;
			for (const [key, field] of Object.entries(value)) {
				const escaped = key.replace(/~/g, "~0").replace(/\//g, "~1").replace(/\*/g, "~2");
				visit(field, `${path}/${escaped}`, path);
			}
		}
	}
	for (const sample of samples) visit(sample, "$");
	return [...nodes.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([path, node]) => ({
			path,
			types: [...node.types].sort(),
			optional: node.parent !== undefined && node.seen < (nodes.get(node.parent)?.objects ?? 0),
		}));
}

/** Record column-zero field/section labels, without inferring types from formatted prose. */
export function textOutline(text: string): string[] {
	return [
		...new Set(
			text
				.replace(/\r\n/g, "\n")
				.split("\n")
				.map((line) => line.match(/^([A-Za-z][A-Za-z0-9 ()/-]*):(?: |$)/)?.[1]?.replace(/\(\d+\)/g, "(count)"))
				.filter((label): label is string => label !== undefined),
		),
	].sort();
}

export function inspectToolResponse(value: unknown) {
	if (value === null || typeof value !== "object" || !Array.isArray((value as { content?: unknown }).content)) {
		throw new Error("Missing MCP response content array.");
	}
	const parsed = CallToolResultSchema.parse(value);
	if (parsed.isError) throw new Error(`Response probe failed: ${JSON.stringify(parsed.content)}`);
	return {
		value,
		texts: parsed.content.flatMap((part) => (part.type === "text" ? [part.text] : [])),
		contentTypes: parsed.content.map((part) => part.type),
	};
}
