import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AutoICD } from "autoicd-js";
import {
  formatCodingResponse,
  formatSearchResponse,
  formatCodeDetail,
  formatAnonymizeResponse,
  formatICD11SearchResponse,
  formatICD11CodeDetail,
  formatICFCodingResponse,
  formatICFCodeDetail,
  formatICFSearchResponse,
  formatICFCoreSetResponse,
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
      title: "Code Clinical Text to ICD-10/ICD-11",
      description:
        "Extract medical diagnoses from clinical text and map them to ICD-10-CM or ICD-11 codes. " +
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
          .describe("Number of top code candidates per entity (1-25, default: 5)"),
        include_negated: z
          .boolean()
          .default(true)
          .describe("Include negated entities in results (default: true)"),
        output_system: z
          .enum(["icd10", "icd11"])
          .default("icd10")
          .describe("Output coding system: 'icd10' (default) or 'icd11'"),
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
          outputSystem: args.output_system,
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
        const result = await client.icd10.search(args.query, {
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
        const result = await client.icd10.get(args.code);
        return ok(formatCodeDetail(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "search_icd11_codes",
    {
      title: "Search ICD-11 Codes",
      description:
        "Search the ICD-11 code directory by description text. " +
        "Returns matching codes with descriptions and Foundation URIs. " +
        "Useful for finding specific ICD-11 diagnosis codes by keyword.",
      inputSchema: {
        query: z.string().min(1).describe("Search query to match against ICD-11 code descriptions"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Maximum results (1-100, default: 10)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icd11.search(args.query, {
          limit: args.limit,
        });
        return ok(formatICD11SearchResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "get_icd11_code",
    {
      title: "Get ICD-11 Code Details",
      description:
        "Get comprehensive details for a specific ICD-11 code including " +
        "descriptions, Foundation URI, synonyms, parent/child hierarchy, " +
        "chapter classification, and ICD-10 crosswalk mappings.",
      inputSchema: {
        code: z.string().min(1).describe("ICD-11 code (e.g., '5A11', 'BA00', 'CA40.0')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icd11.get(args.code);
        return ok(formatICD11CodeDetail(result));
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

  // ─── ICF Tools ───

  server.registerTool(
    "icf_code",
    {
      title: "Code Clinical Text to ICF Categories",
      description:
        "Extract functional concepts from clinical text and map them to ICF " +
        "(International Classification of Functioning, Disability and Health) codes. " +
        "Identifies body functions, structures, activities, participation, and environmental factors. " +
        "Returns ranked ICF code candidates with confidence scores.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("Clinical text to code to ICF categories"),
        top_k: z
          .number()
          .int()
          .min(1)
          .max(25)
          .default(5)
          .describe("Max ICF codes per entity (default: 5)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icf.code(args.text, { topK: args.top_k });
        return ok(formatICFCodingResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "icf_lookup",
    {
      title: "Get ICF Code Details",
      description:
        "Get comprehensive details for a specific ICF code including " +
        "definition, component, chapter, parent/child hierarchy, " +
        "inclusions, exclusions, and index terms.",
      inputSchema: {
        code: z
          .string()
          .min(1)
          .describe("ICF code (e.g., 'b110', 'd450', 's730', 'e120')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icf.lookup(args.code);
        return ok(formatICFCodeDetail(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "icf_search",
    {
      title: "Search ICF Codes",
      description:
        "Search the ICF code directory by description text. " +
        "Returns matching codes with titles, components, and child counts. " +
        "Useful for finding specific ICF codes by keyword.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Search query to match against ICF code descriptions"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Maximum results (default: 20)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icf.search(args.query, { limit: args.limit });
        return ok(formatICFSearchResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "icf_core_set",
    {
      title: "Get ICF Core Set for ICD-10 Diagnosis",
      description:
        "Get the ICF Core Set (brief and comprehensive) for a given ICD-10 diagnosis code. " +
        "Core Sets are pre-selected lists of ICF categories most relevant to a specific condition, " +
        "useful for standardized functional assessment.",
      inputSchema: {
        icd10_code: z
          .string()
          .min(1)
          .describe("ICD-10 code (e.g., 'E11', 'I63', 'F32')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.icf.coreSet(args.icd10_code);
        return ok(formatICFCoreSetResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
