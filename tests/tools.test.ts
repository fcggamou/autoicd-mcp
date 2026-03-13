import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AutoICD, AuthenticationError, NotFoundError } from "autoicd-js";
import type {
  CodingResponse,
  CodeSearchResponse,
  CodeDetailFull,
  AnonymizeResponse,
  ICD11CodeSearchResponse,
  ICD11CodeDetailFull,
} from "autoicd-js";
import { registerTools } from "../src/tools.js";

// Mock data
const mockCodingResponse: CodingResponse = {
  text: "Patient has diabetes",
  provider: "default",
  entity_count: 1,
  entities: [
    {
      entity_text: "diabetes",
      entity_start: 12,
      entity_end: 20,
      negated: false,
      historical: false,
      family_history: false,
      uncertain: false,
      severity: null,
      codes: [
        {
          code: "E11.9",
          description: "Type 2 diabetes mellitus without complications",
          similarity: 0.94,
          confidence: "high",
          matched_term: "diabetes",
        },
      ],
    },
  ],
};

const mockSearchResponse: CodeSearchResponse = {
  query: "diabetes",
  count: 1,
  codes: [
    {
      code: "E11.9",
      short_description: "Type 2 diabetes mellitus without complications",
      long_description: "Type 2 diabetes mellitus without complications",
      is_billable: true,
    },
  ],
};

const mockCodeDetail: CodeDetailFull = {
  code: "E11.9",
  short_description: "Type 2 diabetes mellitus without complications",
  long_description: "Type 2 diabetes mellitus without complications",
  is_billable: true,
  synonyms: { snomed: ["Diabetes type 2"] },
  cross_references: { snomed: ["44054006"] },
  parent: null,
  children: [],
  chapter: { number: 4, range: "E00-E89", title: "Endocrine diseases" },
  block: "E08-E13",
};

const mockAnonymizeResponse: AnonymizeResponse = {
  original_text: "John Smith",
  anonymized_text: "[NAME]",
  pii_count: 1,
  pii_entities: [
    { text: "John Smith", start: 0, end: 10, label: "NAME", replacement: "[NAME]" },
  ],
};

const mockICD11SearchResponse: ICD11CodeSearchResponse = {
  query: "diabetes",
  count: 1,
  codes: [
    {
      code: "5A11",
      short_description: "Type 2 diabetes mellitus",
      long_description: "Type 2 diabetes mellitus",
      foundation_uri: "http://id.who.int/icd/entity/1691003785",
    },
  ],
};

const mockICD11CodeDetail: ICD11CodeDetailFull = {
  code: "5A11",
  short_description: "Type 2 diabetes mellitus",
  long_description: "Type 2 diabetes mellitus",
  foundation_uri: "http://id.who.int/icd/entity/1691003785",
  synonyms: { index_terms: ["DM2", "NIDDM"] },
  cross_references: { snomed: ["44054006"], umls: ["C0011860"] },
  parent: {
    code: "5A1",
    short_description: "Diabetes mellitus",
    long_description: "Diabetes mellitus",
    foundation_uri: null,
  },
  children: [],
  chapter: { number: 5, title: "Endocrine, nutritional or metabolic diseases" },
  block: "5A10-5A14",
  icd10_mappings: [
    {
      code: "E11.9",
      description: "Type 2 diabetes mellitus without complications",
      mapping_type: "equivalent",
      system: "icd10",
    },
  ],
};

function createMockClient() {
  return {
    code: vi.fn(),
    anonymize: vi.fn(),
    codes: {
      search: vi.fn(),
      get: vi.fn(),
    },
    icd11: {
      search: vi.fn(),
      get: vi.fn(),
    },
    lastRateLimit: null,
  } as unknown as AutoICD;
}

function getToolHandler(server: McpServer, toolName: string) {
  const tools = (server as any)._registeredTools as Record<string, any>;
  const tool = tools[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not registered`);
  return tool;
}

async function callTool(server: McpServer, toolName: string, args: Record<string, unknown>) {
  const tool = getToolHandler(server, toolName);
  return await tool.handler(args, {});
}

describe("registerTools", () => {
  let server: McpServer;
  let client: AutoICD;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.0" });
    client = createMockClient();
    registerTools(server, client);
  });

  it("registers all 6 tools", () => {
    const tools = (server as any)._registeredTools as Record<string, any>;
    expect(tools["code_diagnosis"]).toBeDefined();
    expect(tools["search_codes"]).toBeDefined();
    expect(tools["get_code"]).toBeDefined();
    expect(tools["search_icd11_codes"]).toBeDefined();
    expect(tools["get_icd11_code"]).toBeDefined();
    expect(tools["anonymize"]).toBeDefined();
    expect(Object.keys(tools)).toHaveLength(6);
  });

  describe("code_diagnosis", () => {
    it("calls client.code and returns formatted result", async () => {
      (client.code as any).mockResolvedValue(mockCodingResponse);
      const result = await callTool(server, "code_diagnosis", {
        text: "Patient has diabetes",
        top_k: 5,
        include_negated: true,
      });

      expect(client.code).toHaveBeenCalledWith("Patient has diabetes", {
        topK: 5,
        includeNegated: true,
      });
      expect(result.content[0].text).toContain("E11.9");
      expect(result.isError).toBeUndefined();
    });

    it("returns error content on auth failure", async () => {
      (client.code as any).mockRejectedValue(new AuthenticationError());
      const result = await callTool(server, "code_diagnosis", {
        text: "test",
        top_k: 5,
        include_negated: true,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication failed");
    });
  });

  describe("search_codes", () => {
    it("calls client.codes.search and returns formatted result", async () => {
      (client.codes.search as any).mockResolvedValue(mockSearchResponse);
      const result = await callTool(server, "search_codes", {
        query: "diabetes",
        limit: 20,
        offset: 0,
      });

      expect(client.codes.search).toHaveBeenCalledWith("diabetes", {
        limit: 20,
        offset: 0,
      });
      expect(result.content[0].text).toContain("E11.9");
    });
  });

  describe("get_code", () => {
    it("calls client.codes.get and returns formatted result", async () => {
      (client.codes.get as any).mockResolvedValue(mockCodeDetail);
      const result = await callTool(server, "get_code", { code: "E11.9" });

      expect(client.codes.get).toHaveBeenCalledWith("E11.9");
      expect(result.content[0].text).toContain("E11.9");
      expect(result.content[0].text).toContain("Billable");
    });

    it("returns error content on not found", async () => {
      (client.codes.get as any).mockRejectedValue(new NotFoundError("Code not found"));
      const result = await callTool(server, "get_code", { code: "XYZ" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });

  describe("search_icd11_codes", () => {
    it("calls client.icd11.search and returns formatted result", async () => {
      (client.icd11.search as any).mockResolvedValue(mockICD11SearchResponse);
      const result = await callTool(server, "search_icd11_codes", {
        query: "diabetes",
        limit: 10,
      });

      expect(client.icd11.search).toHaveBeenCalledWith("diabetes", {
        limit: 10,
      });
      expect(result.content[0].text).toContain("5A11");
      expect(result.content[0].text).toContain("ICD-11");
    });
  });

  describe("get_icd11_code", () => {
    it("calls client.icd11.get and returns formatted result", async () => {
      (client.icd11.get as any).mockResolvedValue(mockICD11CodeDetail);
      const result = await callTool(server, "get_icd11_code", { code: "5A11" });

      expect(client.icd11.get).toHaveBeenCalledWith("5A11");
      expect(result.content[0].text).toContain("5A11");
      expect(result.content[0].text).toContain("Type 2 diabetes mellitus");
    });

    it("returns error content on not found", async () => {
      (client.icd11.get as any).mockRejectedValue(new NotFoundError("Code not found"));
      const result = await callTool(server, "get_icd11_code", { code: "INVALID" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });

  describe("anonymize", () => {
    it("calls client.anonymize and returns formatted result", async () => {
      (client.anonymize as any).mockResolvedValue(mockAnonymizeResponse);
      const result = await callTool(server, "anonymize", { text: "John Smith" });

      expect(client.anonymize).toHaveBeenCalledWith("John Smith");
      expect(result.content[0].text).toContain("[NAME]");
    });
  });
});
