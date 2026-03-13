import { describe, it, expect } from "vitest";
import type {
  CodingResponse,
  CodeSearchResponse,
  CodeDetailFull,
  AnonymizeResponse,
  ICD11CodeSearchResponse,
  ICD11CodeDetailFull,
} from "autoicd-js";
import {
  AutoICDError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
} from "autoicd-js";
import {
  formatCodingResponse,
  formatSearchResponse,
  formatCodeDetail,
  formatAnonymizeResponse,
  formatICD11SearchResponse,
  formatICD11CodeDetail,
  formatError,
} from "../src/format.js";

const mockCodingResponse: CodingResponse = {
  text: "Patient has type 2 diabetes",
  provider: "default",
  entity_count: 1,
  entities: [
    {
      entity_text: "type 2 diabetes",
      entity_start: 12,
      entity_end: 27,
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
          matched_term: "type 2 diabetes",
        },
        {
          code: "E11.65",
          description: "Type 2 diabetes mellitus with hyperglycemia",
          similarity: 0.82,
          confidence: "moderate",
          matched_term: "diabetes type 2",
        },
      ],
    },
  ],
};

const mockSearchResponse: CodeSearchResponse = {
  query: "diabetes",
  count: 2,
  codes: [
    {
      code: "E11.9",
      short_description: "Type 2 diabetes mellitus without complications",
      long_description: "Type 2 diabetes mellitus without complications",
      is_billable: true,
    },
    {
      code: "E10.9",
      short_description: "Type 1 diabetes mellitus without complications",
      long_description: "Type 1 diabetes mellitus without complications",
      is_billable: true,
    },
  ],
};

const mockCodeDetail: CodeDetailFull = {
  code: "E11.9",
  short_description: "Type 2 diabetes mellitus without complications",
  long_description: "Type 2 diabetes mellitus without complications",
  is_billable: true,
  synonyms: {
    snomed: ["Diabetes mellitus type 2", "Non-insulin dependent diabetes"],
    umls: ["Type II diabetes"],
    icd10_augmented: [],
  },
  cross_references: {
    snomed: ["44054006"],
    umls: ["C0011860"],
  },
  parent: {
    code: "E11",
    short_description: "Type 2 diabetes mellitus",
    long_description: "Type 2 diabetes mellitus",
    is_billable: false,
  },
  children: [],
  chapter: {
    number: 4,
    range: "E00-E89",
    title: "Endocrine, nutritional and metabolic diseases",
  },
  block: "E08-E13",
  icd11_mappings: [],
};

const mockAnonymizeResponse: AnonymizeResponse = {
  original_text: "John Smith was seen on 01/15/2024",
  anonymized_text: "[NAME] was seen on [DATE]",
  pii_count: 2,
  pii_entities: [
    { text: "John Smith", start: 0, end: 10, label: "NAME", replacement: "[NAME]" },
    { text: "01/15/2024", start: 23, end: 33, label: "DATE", replacement: "[DATE]" },
  ],
};

describe("formatCodingResponse", () => {
  it("formats entities with codes", () => {
    const result = formatCodingResponse(mockCodingResponse);
    expect(result).toContain("ICD-10 Coding Results");
    expect(result).toContain("Entities found:** 1");
    expect(result).toContain("type 2 diabetes");
    expect(result).toContain("`E11.9`");
    expect(result).toContain("94.0%");
    expect(result).toContain("high");
  });

  it("shows context flags", () => {
    const response: CodingResponse = {
      ...mockCodingResponse,
      entities: [
        { ...mockCodingResponse.entities[0], negated: true, historical: true },
      ],
    };
    const result = formatCodingResponse(response);
    expect(result).toContain("Negated");
    expect(result).toContain("Historical");
  });

  it("handles empty entities", () => {
    const response: CodingResponse = {
      ...mockCodingResponse,
      entity_count: 0,
      entities: [],
    };
    const result = formatCodingResponse(response);
    expect(result).toContain("No medical entities detected");
  });

  it("shows spell corrections", () => {
    const response: CodingResponse = {
      ...mockCodingResponse,
      entities: [
        { ...mockCodingResponse.entities[0], corrected_from: "diabtes" },
      ],
    };
    const result = formatCodingResponse(response);
    expect(result).toContain('corrected from "diabtes"');
  });
});

describe("formatSearchResponse", () => {
  it("formats search results as table", () => {
    const result = formatSearchResponse(mockSearchResponse);
    expect(result).toContain("Code Search Results");
    expect(result).toContain('"diabetes"');
    expect(result).toContain("2** result(s)");
    expect(result).toContain("`E11.9`");
    expect(result).toContain("`E10.9`");
    expect(result).toContain("Yes");
  });

  it("handles empty results", () => {
    const response: CodeSearchResponse = { query: "xyz", count: 0, codes: [] };
    const result = formatSearchResponse(response);
    expect(result).toContain("No matching codes found");
  });
});

describe("formatCodeDetail", () => {
  it("formats code with full details", () => {
    const result = formatCodeDetail(mockCodeDetail);
    expect(result).toContain("`E11.9`");
    expect(result).toContain("Billable:** Yes");
    expect(result).toContain("Chapter 4");
    expect(result).toContain("E08-E13");
    expect(result).toContain("`E11`");
    expect(result).toContain("SNOMED CT");
    expect(result).toContain("Diabetes mellitus type 2");
    expect(result).toContain("44054006");
  });

  it("skips empty synonym sources", () => {
    const result = formatCodeDetail(mockCodeDetail);
    expect(result).not.toContain("Clinical Terms");
  });
});

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

describe("formatICD11SearchResponse", () => {
  it("formats ICD-11 search results as table", () => {
    const result = formatICD11SearchResponse(mockICD11SearchResponse);
    expect(result).toContain("ICD-11 Code Search Results");
    expect(result).toContain('"diabetes"');
    expect(result).toContain("1** result(s)");
    expect(result).toContain("`5A11`");
    expect(result).toContain("Type 2 diabetes mellitus");
    expect(result).toContain("http://id.who.int/icd/entity/1691003785");
  });

  it("handles empty results", () => {
    const response: ICD11CodeSearchResponse = { query: "xyz", count: 0, codes: [] };
    const result = formatICD11SearchResponse(response);
    expect(result).toContain("No matching codes found");
  });
});

describe("formatICD11CodeDetail", () => {
  it("formats ICD-11 code with full details", () => {
    const result = formatICD11CodeDetail(mockICD11CodeDetail);
    expect(result).toContain("`5A11`");
    expect(result).toContain("Type 2 diabetes mellitus");
    expect(result).toContain("http://id.who.int/icd/entity/1691003785");
    expect(result).toContain("Chapter 5");
    expect(result).toContain("Endocrine, nutritional or metabolic diseases");
    expect(result).toContain("5A10-5A14");
    expect(result).toContain("`5A1`");
    expect(result).toContain("Diabetes mellitus");
  });

  it("formats ICD-10 crosswalk mappings", () => {
    const result = formatICD11CodeDetail(mockICD11CodeDetail);
    expect(result).toContain("ICD-10 Crosswalk Mappings");
    expect(result).toContain("`E11.9`");
    expect(result).toContain("equivalent");
  });

  it("formats synonyms and cross-references", () => {
    const result = formatICD11CodeDetail(mockICD11CodeDetail);
    expect(result).toContain("DM2");
    expect(result).toContain("NIDDM");
    expect(result).toContain("SNOMED CT");
    expect(result).toContain("44054006");
    expect(result).toContain("UMLS");
    expect(result).toContain("C0011860");
  });

  it("omits foundation URI when null", () => {
    const detail: ICD11CodeDetailFull = {
      ...mockICD11CodeDetail,
      foundation_uri: null,
    };
    const result = formatICD11CodeDetail(detail);
    expect(result).not.toContain("Foundation URI");
  });
});

describe("formatAnonymizeResponse", () => {
  it("formats de-identified text with entity table", () => {
    const result = formatAnonymizeResponse(mockAnonymizeResponse);
    expect(result).toContain("De-identified Text");
    expect(result).toContain("[NAME] was seen on [DATE]");
    expect(result).toContain("PHI entities detected:** 2");
    expect(result).toContain("John Smith");
    expect(result).toContain("NAME");
    expect(result).toContain("DATE");
  });
});

describe("formatError", () => {
  it("formats authentication error", () => {
    const result = formatError(new AuthenticationError());
    expect(result).toContain("Authentication failed");
    expect(result).toContain("autoicdapi.com/dashboard");
  });

  it("formats rate limit error", () => {
    const error = new RateLimitError("Rate limited", {
      limit: 100,
      remaining: 0,
      resetAt: new Date("2026-01-01T00:00:00Z"),
    });
    const result = formatError(error);
    expect(result).toContain("Rate limit exceeded");
    expect(result).toContain("100");
    expect(result).toContain("autoicdapi.com/pricing");
  });

  it("formats not found error", () => {
    const result = formatError(new NotFoundError("Code XYZ not found"));
    expect(result).toContain("Not found");
    expect(result).toContain("Code XYZ not found");
  });

  it("formats generic API error", () => {
    const result = formatError(new AutoICDError(502, "Pipeline error"));
    expect(result).toContain("API error (502)");
    expect(result).toContain("Pipeline error");
  });

  it("formats unknown errors", () => {
    expect(formatError("something")).toContain("Unknown error");
    expect(formatError(new Error("oops"))).toContain("oops");
  });
});
