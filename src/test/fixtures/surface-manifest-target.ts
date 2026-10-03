import { appendFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	ListPromptsRequestSchema,
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Command } from "commander";

const settings = process.argv[2] === "--fixture-config" ? JSON.parse(process.argv.splice(2, 2)[1] ?? "{}") : {};
const mode = process.argv[2];
function recordPid() {
	if (settings.pidFile) appendFileSync(settings.pidFile, `${process.pid}\n`);
}
if ((settings.hangCli && process.argv.includes("--help")) || (settings.hangMcp && mode === "mcp")) {
	recordPid();
	if (settings.ignoreTerm) process.on("SIGTERM", () => {});
	setInterval(() => {}, 1_000);
} else if (settings.malformedHelp && process.argv.includes("--help")) {
	console.log("This is not CLI help.");
} else if (mode === "mcp") {
	recordPid();
	const limited = settings.limited;
	const server = new Server(
		{ name: "Surface fixture", version: "1.0.0" },
		{ capabilities: limited ? {} : { tools: {}, resources: {}, prompts: {} } },
	);
	if (!limited) {
		server.setRequestHandler(ListToolsRequestSchema, async ({ params }) => ({
			tools: [
				{
					name: params?.cursor ? "alpha" : "zeta",
					inputSchema: {
						type: "object" as const,
						properties: { title: { type: "string", enum: settings.changedSchema ? ["three"] : ["two", "one"] } },
						required: ["title"],
						additionalProperties: false,
					},
					...(settings.unresolvedOutput
						? {
								outputSchema: {
									type: "object" as const,
									properties: { value: { $ref: "https://example.org/schema/value" } },
								},
							}
						: {}),
				},
			],
			nextCursor: settings.loop || !params?.cursor ? "page-two" : undefined,
		}));
		server.setRequestHandler(ListResourcesRequestSchema, async ({ params }) => ({
			resources: [{ name: params?.cursor ? "alpha" : "zeta", uri: `fixture://${params?.cursor ? "a" : "z"}` }],
			nextCursor: params?.cursor ? undefined : "page-two",
		}));
		server.setRequestHandler(ListResourceTemplatesRequestSchema, async ({ params }) => ({
			resourceTemplates: [
				{ name: params?.cursor ? "alpha" : "zeta", uriTemplate: `fixture://${params?.cursor ? "a" : "z"}/{id}` },
			],
			nextCursor: params?.cursor ? undefined : "page-two",
		}));
		server.setRequestHandler(ListPromptsRequestSchema, async ({ params }) => ({
			prompts: [{ name: params?.cursor ? "alpha" : "zeta", arguments: [{ name: "title", required: true }] }],
			nextCursor: params?.cursor ? undefined : "page-two",
		}));
	}
	await server.connect(new StdioServerTransport());
} else {
	const cli = new Command().name("fixture").version("1.0.0");
	cli.command("task").alias("tasks").command("create <title> [labels...]").option("-d, --description <text>");
	cli.command("inspect").option("--format [kind]", "output format").option("--no-cache");
	cli.command("hidden", { hidden: true });
	cli.parse(process.argv);
}
