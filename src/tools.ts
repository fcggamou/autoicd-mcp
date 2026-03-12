import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AutoICD } from "autoicd-js";
import {
  formatCodingResponse,
  formatSearchResponse,
  formatCodeDetail,
  formatAnonymizeResponse,
  formatError,
} from "./format.js";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function fail(error: unknown) {
  return { content: [{ type: "text" as const, text: formatError(error) }], isError: true };
}

export function registerTools(server: McpServer, client: AutoICD): void {
  server.registerTool(
    "code_diagnosis",
    {
      title: "Code Clinical Text to ICD-10",
      description:
        "Extract medical diagnoses from clinical text and map them to ICD-10-CM codes. " +
        "Identifies conditions, negations, historical mentions, family history, and severity. " +
        "Returns ranked code candidates with confidence scores.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("Clinical text to process (progress notes, discharge summaries, etc.)"),
        top_k: z
          .number()
          .int()
          .min(1)
          .max(25)
          .default(5)
          .describe("Number of top ICD-10 candidates per entity (1-25, default: 5)"),
        include_negated: z
          .boolean()
          .default(true)
          .describe("Include negated entities in results (default: true)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = await client.code(args.text, {
          topK: args.top_k,
          includeNegated: args.include_negated,
        });
        return ok(formatCodingResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "search_codes",
    {
      title: "Search ICD-10 Codes",
      description:
        "Search the ICD-10-CM 2025 code directory by description text. " +
        "Returns matching codes with descriptions and billable status. " +
        "Useful for finding specific diagnosis codes by keyword.",
      inputSchema: {
        query: z.string().min(1).describe("Search query to match against ICD-10 code descriptions"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Maximum results (1-100, default: 20)"),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Pagination offset (default: 0)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.codes.search(args.query, {
          limit: args.limit,
          offset: args.offset,
        });
        return ok(formatSearchResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "get_code",
    {
      title: "Get ICD-10 Code Details",
      description:
        "Get comprehensive details for a specific ICD-10-CM code including " +
        "descriptions, billable status, SNOMED CT and UMLS synonyms, parent/child " +
        "hierarchy, and chapter classification.",
      inputSchema: {
        code: z.string().min(1).describe("ICD-10-CM code (e.g., 'E11.9', 'I10', 'J44.1')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.codes.get(args.code);
        return ok(formatCodeDetail(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "anonymize",
    {
      title: "De-identify Clinical Text (PHI Removal)",
      description:
        "Detect and mask Protected Health Information (PHI) in clinical text. " +
        "Replaces names, dates, SSNs, phone numbers, emails, addresses, MRNs, and ages " +
        "with type labels like [NAME], [DATE], [SSN]. HIPAA-compliant de-identification.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("Clinical text containing PHI to de-identify"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    async (args) => {
      try {
        const result = await client.anonymize(args.text);
        return ok(formatAnonymizeResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
