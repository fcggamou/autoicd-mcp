// Read version from package.json so the MCP serverInfo.version always
// matches the published npm package and never silently drifts.
import pkg from "../package.json" with { type: "json" };

export const SERVER_NAME = "autoicd-mcp";
export const SERVER_VERSION = pkg.version;
export const API_KEY_ENV_VAR = "AUTOICD_API_KEY";
export const DEFAULT_BASE_URL = "https://autoicdapi.com";
