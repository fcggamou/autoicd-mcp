import type {
  CodingResponse,
  CodingEntity,
  CodeMatch,
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

export function formatCodingResponse(response: CodingResponse): string {
  const lines: string[] = [];
  lines.push("## ICD-10 Coding Results\n");
  lines.push(`**Entities found:** ${response.entity_count}\n`);

  if (response.entities.length === 0) {
    lines.push("No medical entities detected in the input text.");
    return lines.join("\n");
  }

  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    lines.push(formatEntity(entity, i + 1));
  }

  return lines.join("\n");
}

function formatEntity(entity: CodingEntity, index: number): string {
  const lines: string[] = [];
  let heading = `### ${index}. ${entity.entity_text}`;
  if (entity.corrected_from) {
    heading += ` _(corrected from "${entity.corrected_from}")_`;
  }
  lines.push(heading);

  const flags: string[] = [];
  if (entity.negated) flags.push("Negated");
  if (entity.historical) flags.push("Historical");
  if (entity.family_history) flags.push("Family History");
  if (entity.uncertain) flags.push("Uncertain");
  if (entity.severity) flags.push(`Severity: ${entity.severity}`);
  if (flags.length > 0) {
    lines.push(`**Context:** ${flags.join(" | ")}`);
  }

  if (entity.codes.length > 0) {
    lines.push("");
    lines.push("| Rank | Code | Description | Confidence | Score |");
    lines.push("|------|------|-------------|------------|-------|");
    for (let i = 0; i < entity.codes.length; i++) {
      lines.push(formatCodeMatch(entity.codes[i], i + 1));
    }
  }

  lines.push("");
  return lines.join("\n");
}

function formatCodeMatch(match: CodeMatch, rank: number): string {
  const score = (match.similarity * 100).toFixed(1);
  return `| ${rank} | \`${match.code}\` | ${match.description} | ${match.confidence} | ${score}% |`;
}

export function formatSearchResponse(response: CodeSearchResponse): string {
  const lines: string[] = [];
  lines.push("## ICD-10 Code Search Results\n");
  lines.push(`**Query:** "${response.query}" — **${response.count}** result(s)\n`);

  if (response.codes.length === 0) {
    lines.push("No matching codes found.");
    return lines.join("\n");
  }

  lines.push("| Code | Description | Billable |");
  lines.push("|------|-------------|----------|");
  for (const code of response.codes) {
    const billable = code.is_billable ? "Yes" : "No";
    lines.push(`| \`${code.code}\` | ${code.short_description} | ${billable} |`);
  }

  return lines.join("\n");
}

export function formatCodeDetail(detail: CodeDetailFull): string {
  const lines: string[] = [];
  lines.push(`## \`${detail.code}\` — ${detail.short_description}\n`);
  lines.push(`**Full description:** ${detail.long_description}`);
  lines.push(`**Billable:** ${detail.is_billable ? "Yes" : "No"}`);

  if (detail.chapter) {
    lines.push(
      `**Chapter ${detail.chapter.number}:** ${detail.chapter.title} (${detail.chapter.range})`
    );
  }
  if (detail.block) {
    lines.push(`**Block:** ${detail.block}`);
  }

  if (detail.parent) {
    lines.push(
      `\n**Parent:** \`${detail.parent.code}\` — ${detail.parent.short_description}`
    );
  }

  if (detail.children.length > 0) {
    lines.push(`\n**Child codes (${detail.children.length}):**`);
    for (const child of detail.children) {
      const billable = child.is_billable ? " (billable)" : "";
      lines.push(`- \`${child.code}\` — ${child.short_description}${billable}`);
    }
  }

  const synonymSources = Object.entries(detail.synonyms).filter(
    ([, terms]) => terms.length > 0
  );
  if (synonymSources.length > 0) {
    lines.push("\n**Synonyms:**");
    for (const [source, terms] of synonymSources) {
      const label = sourceLabel(source);
      lines.push(`- **${label}:** ${terms.join(", ")}`);
    }
  }

  const crossRefSources = Object.entries(detail.cross_references).filter(
    ([, ids]) => ids.length > 0
  );
  if (crossRefSources.length > 0) {
    lines.push("\n**Cross-references:**");
    for (const [source, ids] of crossRefSources) {
      const label = sourceLabel(source);
      lines.push(`- **${label}:** ${ids.join(", ")}`);
    }
  }

  if (detail.icd11_mappings && detail.icd11_mappings.length > 0) {
    lines.push("\n**ICD-11 Crosswalk Mappings:**");
    lines.push("| ICD-11 Code | Description | Mapping Type |");
    lines.push("|-------------|-------------|--------------|");
    for (const mapping of detail.icd11_mappings) {
      lines.push(`| \`${mapping.code}\` | ${mapping.description} | ${mapping.mapping_type} |`);
    }
  }

  return lines.join("\n");
}

function sourceLabel(source: string): string {
  switch (source) {
    case "snomed":
      return "SNOMED CT";
    case "umls":
      return "UMLS";
    case "icd10_augmented":
      return "Clinical Terms";
    default:
      return source;
  }
}

export function formatICD11SearchResponse(response: ICD11CodeSearchResponse): string {
  const lines: string[] = [];
  lines.push("## ICD-11 Code Search Results\n");
  lines.push(`**Query:** "${response.query}" — **${response.count}** result(s)\n`);

  if (response.codes.length === 0) {
    lines.push("No matching codes found.");
    return lines.join("\n");
  }

  lines.push("| Code | Description | Foundation URI |");
  lines.push("|------|-------------|----------------|");
  for (const code of response.codes) {
    const uri = code.foundation_uri ?? "—";
    lines.push(`| \`${code.code}\` | ${code.short_description} | ${uri} |`);
  }

  return lines.join("\n");
}

export function formatICD11CodeDetail(detail: ICD11CodeDetailFull): string {
  const lines: string[] = [];
  lines.push(`## \`${detail.code}\` — ${detail.short_description}\n`);
  lines.push(`**Full description:** ${detail.long_description}`);
  if (detail.foundation_uri) {
    lines.push(`**Foundation URI:** ${detail.foundation_uri}`);
  }

  if (detail.chapter) {
    lines.push(
      `**Chapter ${detail.chapter.number}:** ${detail.chapter.title}`
    );
  }
  if (detail.block) {
    lines.push(`**Block:** ${detail.block}`);
  }

  if (detail.parent) {
    lines.push(
      `\n**Parent:** \`${detail.parent.code}\` — ${detail.parent.short_description}`
    );
  }

  if (detail.children.length > 0) {
    lines.push(`\n**Child codes (${detail.children.length}):**`);
    for (const child of detail.children) {
      lines.push(`- \`${child.code}\` — ${child.short_description}`);
    }
  }

  const synonymSources = Object.entries(detail.synonyms).filter(
    ([, terms]) => terms.length > 0
  );
  if (synonymSources.length > 0) {
    lines.push("\n**Synonyms:**");
    for (const [source, terms] of synonymSources) {
      const label = sourceLabel(source);
      lines.push(`- **${label}:** ${terms.join(", ")}`);
    }
  }

  const crossRefSources = Object.entries(detail.cross_references).filter(
    ([, ids]) => ids.length > 0
  );
  if (crossRefSources.length > 0) {
    lines.push("\n**Cross-references:**");
    for (const [source, ids] of crossRefSources) {
      const label = sourceLabel(source);
      lines.push(`- **${label}:** ${ids.join(", ")}`);
    }
  }

  if (detail.icd10_mappings.length > 0) {
    lines.push("\n**ICD-10 Crosswalk Mappings:**");
    lines.push("| ICD-10 Code | Description | Mapping Type |");
    lines.push("|-------------|-------------|--------------|");
    for (const mapping of detail.icd10_mappings) {
      lines.push(`| \`${mapping.code}\` | ${mapping.description} | ${mapping.mapping_type} |`);
    }
  }

  return lines.join("\n");
}

export function formatAnonymizeResponse(response: AnonymizeResponse): string {
  const lines: string[] = [];
  lines.push("## De-identified Text\n");
  lines.push(response.anonymized_text);
  lines.push(`\n**PHI entities detected:** ${response.pii_count}`);

  if (response.pii_entities.length > 0) {
    lines.push("");
    lines.push("| Type | Original | Replacement |");
    lines.push("|------|----------|-------------|");
    for (const entity of response.pii_entities) {
      lines.push(`| ${entity.label} | ${entity.text} | ${entity.replacement} |`);
    }
  }

  return lines.join("\n");
}

export function formatError(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return "**Authentication failed.** Your API key is invalid or revoked. Get a new key at https://autoicdapi.com/dashboard";
  }
  if (error instanceof RateLimitError) {
    const reset = error.rateLimit.resetAt.toISOString();
    return `**Rate limit exceeded.** ${error.rateLimit.remaining} of ${error.rateLimit.limit} requests remaining. Resets at ${reset}. Upgrade your plan at https://autoicdapi.com/pricing`;
  }
  if (error instanceof NotFoundError) {
    return `**Not found.** ${error.message}`;
  }
  if (error instanceof AutoICDError) {
    return `**API error (${error.status}).** ${error.message}`;
  }
  if (error instanceof Error) {
    return `**Error.** ${error.message}`;
  }
  return "**Unknown error.** An unexpected error occurred.";
}
