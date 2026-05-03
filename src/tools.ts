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
  formatICFCodeDetail,
  formatICFSearchResponse,
  formatICFCoreSetResponse,
  formatLOINCCodeDetail,
  formatLOINCSearchResponse,
  formatLOINCCodingResponse,
  formatAuditResponse,
  formatTranslateResponse,
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
        "Code clinical text to ICD-10-CM codes with cross-references to ICD-11, SNOMED CT, UMLS, and ICF",
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
        include_icf: z
          .boolean()
          .default(false)
          .describe("Include ICF functioning code results in the response"),
        include_icd11: z
          .boolean()
          .default(false)
          .describe("Include ICD-11 crosswalk codes per match"),
        include_snomed: z
          .boolean()
          .default(false)
          .describe("Include SNOMED CT concept IDs per match"),
        include_umls: z
          .boolean()
          .default(false)
          .describe("Include UMLS CUIs per match"),
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
          includeIcf: args.include_icf,
          includeIcd11: args.include_icd11,
          includeSnomed: args.include_snomed,
          includeUmls: args.include_umls,
        } as Parameters<typeof client.code>[1]);
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
        "Get full ICD-10 code details including descriptions, synonyms, SNOMED CT & UMLS cross-references, ICD-11 crosswalk mappings, ICF categories, and hierarchy",
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
        "Get full ICD-11 code details including descriptions, synonyms, SNOMED CT & UMLS cross-references, ICD-10 crosswalk mappings, ICF categories, and hierarchy",
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
    "icf_lookup",
    {
      title: "Get ICF Code Details",
      description:
        "Get full ICF code details including definition, hierarchy, related ICD-10/ICD-11 codes, and SNOMED CT/UMLS cross-references",
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

  // ─── LOINC Tools ───

  server.registerTool(
    "loinc_code",
    {
      title: "Code Clinical Text to LOINC Codes",
      description:
        "Code clinical text to LOINC codes. Extracts lab tests, imaging orders, and clinical observations from free text and matches to LOINC codes.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("Clinical text to code to LOINC codes"),
        top_k: z
          .number()
          .int()
          .min(1)
          .max(25)
          .default(5)
          .describe("Max LOINC codes per entity (default: 5)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.loinc.code(args.text, { topK: args.top_k });
        return ok(formatLOINCCodingResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "loinc_lookup",
    {
      title: "Get LOINC Code Details",
      description:
        "Get full LOINC code details including 6-axis classification (component, property, time, system, scale, method), definition, and cross-references",
      inputSchema: {
        code: z
          .string()
          .min(1)
          .describe("LOINC code (e.g., '2345-7', '718-7', '4548-4')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.loinc.lookup(args.code);
        return ok(formatLOINCCodeDetail(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "loinc_search",
    {
      title: "Search LOINC Codes",
      description:
        "Search the LOINC code directory by description text. " +
        "Returns matching codes with names, classes, and types. " +
        "Useful for finding specific lab tests or clinical observations by keyword.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Search query to match against LOINC code descriptions"),
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
        const result = await client.loinc.search(args.query, { limit: args.limit });
        return ok(formatLOINCSearchResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "audit_clinical_text",
    {
      title: "Audit Chart for HCC Gaps and Coding Risk",
      description:
        "Audit clinical text against submitted ICD-10 codes. Surfaces missed HCCs with dollar impact, " +
        "unsupported codes (RADV exposure), specificity upgrades, denial risk flags, and a reconciled " +
        "problem list. Every finding carries extractive evidence spans pointing back to the source text. " +
        "Uses the CMS PY2026 v22 and v28 community models for HCC gap capture.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe(
            "Clinical text to audit (progress note, discharge summary, H&P). Evidence spans reference character offsets in this text."
          ),
        codes: z
          .array(
            z.object({
              code: z.string().describe("ICD-10 code (e.g., 'E11.9')"),
              kind: z
                .enum(["icd10", "icd11", "cpt", "hcpcs"])
                .default("icd10")
                .describe("Coding system for this code."),
            })
          )
          .describe("Codes the clinician submitted on the claim."),
        capabilities: z
          .array(z.enum(["hcc", "radv", "specificity", "denial", "problem_list"]))
          .optional()
          .describe(
            "Which audit capabilities to run. Defaults to all five when omitted. Pass ['hcc'] for a targeted HCC gap scan."
          ),
        patient_age: z
          .number()
          .int()
          .min(0)
          .max(130)
          .optional()
          .describe("Patient age. Enables age-specific denial checks when provided."),
        patient_sex: z
          .enum(["male", "female"])
          .optional()
          .describe("Patient sex. Enables sex-specific denial checks when provided."),
        coverage: z
          .enum([
            "medicare_advantage",
            "fee_for_service",
            "medicaid",
            "commercial",
            "aco",
          ])
          .optional()
          .describe(
            "Patient coverage type. Influences HCC revenue estimates when provided."
          ),
        hcc_model: z
          .enum(["v22", "v28", "both"])
          .default("both")
          .describe(
            "CMS-HCC model for gap capture. PY2026 MA payment uses v22 + v28. Defaults to both."
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const patient =
          args.patient_age !== undefined ||
          args.patient_sex !== undefined ||
          args.coverage !== undefined
            ? {
                ...(args.patient_age !== undefined ? { age: args.patient_age } : {}),
                ...(args.patient_sex !== undefined ? { sex: args.patient_sex } : {}),
                ...(args.coverage !== undefined ? { coverage: args.coverage } : {}),
              }
            : undefined;

        const result = await client.audit({
          text: args.text,
          codes: args.codes,
          ...(args.capabilities !== undefined ? { capabilities: args.capabilities } : {}),
          context: {
            hcc_model: args.hcc_model,
            ...(patient ? { patient } : {}),
          },
        });
        return ok(formatAuditResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.registerTool(
    "translate_code",
    {
      title: "Translate a Code Between Coding Systems",
      description:
        "Map a code in one healthcare coding system (ICD-10, ICD-11, SNOMED CT, UMLS, ICF) to equivalents in requested target systems. Supports ICD-10 -> ICD-11 / SNOMED / UMLS / ICF, ICD-11 -> ICD-10, and ICF -> ICD-10. Targets that are not reachable from the source are returned in 'unsupported_targets' rather than as errors.",
      inputSchema: {
        code: z
          .string()
          .min(1)
          .describe("The code to translate (e.g., 'E11.9' for ICD-10, '5A11' for ICD-11)."),
        system: z
          .enum(["icd10", "icd11", "snomed", "umls", "icf"])
          .describe("The source coding system for the code."),
        to: z
          .array(z.enum(["icd10", "icd11", "snomed", "umls", "icf"]))
          .optional()
          .describe(
            "Target coding systems to map to. Omit to get every system reachable from the source.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        const result = await client.translate({
          from: { code: args.code, system: args.system },
          ...(args.to !== undefined ? { to: args.to } : {}),
        });
        return ok(formatTranslateResponse(result));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
