import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AutoICD } from "autoicd-js";
import { SERVER_NAME, SERVER_VERSION, API_KEY_ENV_VAR, DEFAULT_BASE_URL } from "./config.js";
import { registerTools } from "./tools.js";

async function main() {
  const apiKey = process.env[API_KEY_ENV_VAR];
  if (!apiKey) {
    console.error(
      `Error: ${API_KEY_ENV_VAR} environment variable is required.\n` +
        `Get your API key at https://autoicdapi.com/dashboard`
    );
    process.exit(1);
  }

  const baseURL = process.env.AUTOICD_BASE_URL || DEFAULT_BASE_URL;

  const client = new AutoICD({ apiKey, baseURL });
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Smithery sandbox export — allows registry to scan tools without real credentials
export function createSandboxServer() {
  const client = new AutoICD({ apiKey: "sk_sandbox" });
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerTools(server, client);
  return server;
}
