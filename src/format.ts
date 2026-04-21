import type {
  CodingResponse,
  CodingEntity,
  CodeMatch,
  CodeSearchResponse,
  CodeDetailFull,
  AnonymizeResponse,
  ICD11CodeSearchResponse,
  ICD11CodeDetailFull,
  ICFCodingResponse,
  ICFCodeDetail,
  ICFSearchResponse,
  ICFCoreSetResult,
  ICFComponent,
  LOINCCodeDetail,
  LOINCSearchResponse,
  LOINCCodingResponse,
  AuditResponse,
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

  // ICF section
  const icfEntities = (response as unknown as Record<string, unknown>).icf_entities as Array<{entity_text: string; codes: Array<{code: string; description: string; component: string; similarity: number}>}> | undefined;
  if (icfEntities && icfEntities.length > 0) {
    lines.push("\n## ICF Functioning Code Results\n");
    lines.push(`**ICF entities found:** ${icfEntities.length}\n`);
    for (let i = 0; i < icfEntities.length; i++) {
      const entity = icfEntities[i];
      lines.push(`### ${i + 1}. ${entity.entity_text}\n`);
      if (entity.codes.length > 0) {
        lines.push("| Rank | Code | Description | Component | Score |");
        lines.push("|------|------|-------------|-----------|-------|");
        for (let j = 0; j < entity.codes.length; j++) {
          const c = entity.codes[j];
          const score = (c.similarity * 100).toFixed(1);
          lines.push(`| ${j + 1} | \`${c.code}\` | ${c.description} | ${c.component} | ${score}% |`);
        }
      }
      lines.push("");
    }
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

    const top = entity.codes[0];
    const refs: string[] = [];
    if (top.icd11_codes?.length) refs.push(`ICD-11: ${top.icd11_codes.join(", ")}`);
    if (top.snomed_ids?.length) refs.push(`SNOMED: ${top.snomed_ids.join(", ")}`);
    if (top.umls_cuis?.length) refs.push(`UMLS: ${top.umls_cuis.join(", ")}`);
    if (top.icf_categories?.length) refs.push(`ICF: ${top.icf_categories.join(", ")}`);
    if (refs.length) lines.push("", "**Cross-references (top match):** " + refs.join(" | "));
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

  if (detail.icf_categories?.length) {
    lines.push("", "### Related ICF Categories", "");
    lines.push("| Code | Title | Component |");
    lines.push("|------|-------|-----------|");
    for (const cat of detail.icf_categories) {
      lines.push(`| ${cat.code} | ${cat.title} | ${componentLabel(cat.component)} |`);
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

  if (detail.icf_categories?.length) {
    lines.push("", "### Related ICF Categories", "");
    lines.push("| Code | Title | Component |");
    lines.push("|------|-------|-----------|");
    for (const cat of detail.icf_categories) {
      lines.push(`| ${cat.code} | ${cat.title} | ${componentLabel(cat.component)} |`);
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

// ─── ICF Formatters ───

function componentLabel(component: ICFComponent): string {
  switch (component) {
    case "b":
      return "Body Functions";
    case "s":
      return "Body Structures";
    case "d":
      return "Activities & Participation";
    case "e":
      return "Environmental Factors";
    default:
      return component;
  }
}

export function formatICFCodingResponse(response: ICFCodingResponse): string {
  const lines: string[] = [];
  lines.push("## ICF Coding Results\n");
  lines.push(`**Entities found:** ${response.entity_count}\n`);

  if (response.results.length === 0) {
    lines.push("No functional entities detected in the input text.");
    return lines.join("\n");
  }

  for (let i = 0; i < response.results.length; i++) {
    const entity = response.results[i];
    lines.push(`### ${i + 1}. ${entity.entity_text}\n`);

    if (entity.codes.length > 0) {
      lines.push("| Rank | Code | Description | Component | Confidence | Score |");
      lines.push("|------|------|-------------|-----------|------------|-------|");
      for (let j = 0; j < entity.codes.length; j++) {
        const match = entity.codes[j];
        const score = (match.similarity * 100).toFixed(1);
        lines.push(
          `| ${j + 1} | \`${match.code}\` | ${match.description} | ${componentLabel(match.component)} | ${match.confidence} | ${score}% |`
        );
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function formatICFCodeDetail(detail: ICFCodeDetail): string {
  const lines: string[] = [];
  lines.push(`## \`${detail.code}\` — ${detail.title}\n`);
  lines.push(`**Component:** ${componentLabel(detail.component)}`);
  lines.push(`**Chapter:** ${detail.chapter}`);

  if (detail.definition) {
    lines.push(`\n**Definition:** ${detail.definition}`);
  }

  if (detail.inclusions.length > 0) {
    lines.push("\n**Inclusions:**");
    for (const inc of detail.inclusions) {
      lines.push(`- ${inc}`);
    }
  }

  if (detail.exclusions.length > 0) {
    lines.push("\n**Exclusions:**");
    for (const exc of detail.exclusions) {
      lines.push(`- ${exc}`);
    }
  }

  if (detail.parent) {
    lines.push(
      `\n**Parent:** \`${detail.parent.code}\` — ${detail.parent.title}`
    );
  }

  if (detail.children.length > 0) {
    lines.push(`\n**Child codes (${detail.children.length}):**`);
    for (const child of detail.children) {
      lines.push(`- \`${child.code}\` — ${child.title}`);
    }
  }

  if (detail.index_terms.length > 0) {
    lines.push(`\n**Index terms:** ${detail.index_terms.join(", ")}`);
  }

  if (detail.icd10_mappings?.length) {
    lines.push("", "### Related ICD-10 Codes", "");
    lines.push("| Code | Description |");
    lines.push("|------|-------------|");
    for (const m of detail.icd10_mappings) {
      lines.push(`| ${m.code} | ${m.description} |`);
    }
  }
  if (detail.icd11_mappings?.length) {
    lines.push("", "### Related ICD-11 Codes", "");
    lines.push("| Code | Description |");
    lines.push("|------|-------------|");
    for (const m of detail.icd11_mappings) {
      lines.push(`| ${m.code} | ${m.description} |`);
    }
  }
  const xrefs = detail.cross_references;
  if (xrefs && Object.keys(xrefs).length) {
    lines.push("", "### Cross-References", "");
    for (const [source, ids] of Object.entries(xrefs)) {
      lines.push(`**${sourceLabel(source)}:** ${(ids as string[]).join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function formatICFSearchResponse(response: ICFSearchResponse): string {
  const lines: string[] = [];
  lines.push("## ICF Code Search Results\n");
  lines.push(`**Query:** "${response.query}" — **${response.count}** result(s)\n`);

  if (response.codes.length === 0) {
    lines.push("No matching ICF codes found.");
    return lines.join("\n");
  }

  lines.push("| Code | Title | Component | Children |");
  lines.push("|------|-------|-----------|----------|");
  for (const code of response.codes) {
    lines.push(
      `| \`${code.code}\` | ${code.title} | ${componentLabel(code.component)} | ${code.child_count} |`
    );
  }

  return lines.join("\n");
}

export function formatICFCoreSetResponse(response: ICFCoreSetResult): string {
  const lines: string[] = [];
  lines.push(`## ICF Core Set for \`${response.icd10_code}\` — ${response.condition_name}\n`);

  lines.push(`### Brief Core Set (${response.brief.length} codes)\n`);
  if (response.brief.length === 0) {
    lines.push("No brief core set codes available.");
  } else {
    lines.push("| Code | Title | Component |");
    lines.push("|------|-------|-----------|");
    for (const code of response.brief) {
      lines.push(`| \`${code.code}\` | ${code.title} | ${componentLabel(code.component)} |`);
    }
  }

  lines.push(`\n### Comprehensive Core Set (${response.comprehensive.length} codes)\n`);
  if (response.comprehensive.length === 0) {
    lines.push("No comprehensive core set codes available.");
  } else {
    lines.push("| Code | Title | Component |");
    lines.push("|------|-------|-----------|");
    for (const code of response.comprehensive) {
      lines.push(`| \`${code.code}\` | ${code.title} | ${componentLabel(code.component)} |`);
    }
  }

  return lines.join("\n");
}

// ─── LOINC Formatters ───

const CLASSTYPE_LABELS: Record<number, string> = {
  1: "Laboratory",
  2: "Clinical",
  3: "Claims",
  4: "Surveys",
};

export function formatLOINCCodeDetail(detail: LOINCCodeDetail): string {
  const lines: string[] = [];
  lines.push(`## \`${detail.code}\` — ${detail.long_common_name}\n`);
  lines.push(`**Class:** ${detail.class_name} (${CLASSTYPE_LABELS[detail.class_type] ?? "Unknown"})`);

  if (detail.definition) {
    lines.push(`\n**Definition:** ${detail.definition}`);
  }

  // 6-axis classification
  lines.push("\n### LOINC 6-Axis Classification\n");
  lines.push("| Axis | Value |");
  lines.push("|------|-------|");
  lines.push(`| Component | ${detail.component || "N/A"} |`);
  lines.push(`| Property | ${detail.property || "N/A"} |`);
  lines.push(`| Time Aspect | ${detail.time_aspect || "N/A"} |`);
  lines.push(`| System | ${detail.system || "N/A"} |`);
  lines.push(`| Scale Type | ${detail.scale_type || "N/A"} |`);
  lines.push(`| Method Type | ${detail.method_type || "N/A"} |`);

  if (detail.order_obs) {
    lines.push(`\n**Order/Observation:** ${detail.order_obs}`);
  }

  if (detail.consumer_name) {
    lines.push(`**Consumer Name:** ${detail.consumer_name}`);
  }

  if (detail.related_names.length > 0) {
    lines.push(`\n**Related Names:** ${detail.related_names.join("; ")}`);
  }

  const xrefs = detail.cross_references;
  if (xrefs && Object.keys(xrefs).length) {
    lines.push("", "### Cross-References", "");
    for (const [source, ids] of Object.entries(xrefs)) {
      lines.push(`**${sourceLabel(source)}:** ${(ids as string[]).join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function formatLOINCCodingResponse(response: LOINCCodingResponse): string {
  const lines: string[] = [];
  lines.push("## LOINC Coding Results\n");
  lines.push(`**Entities found:** ${response.entity_count}\n`);

  if (response.results.length === 0) {
    lines.push("No lab or observation entities detected in the input text.");
    return lines.join("\n");
  }

  for (let i = 0; i < response.results.length; i++) {
    const entity = response.results[i];
    lines.push(`### ${i + 1}. ${entity.entity_text}\n`);

    if (entity.codes.length > 0) {
      lines.push("| Rank | Code | Name | Component | System | Confidence | Score |");
      lines.push("|------|------|------|-----------|--------|------------|-------|");
      for (let j = 0; j < entity.codes.length; j++) {
        const match = entity.codes[j];
        const score = (match.similarity * 100).toFixed(1);
        lines.push(
          `| ${j + 1} | \`${match.code}\` | ${match.long_common_name} | ${match.component} | ${match.system} | ${match.confidence} | ${score}% |`
        );
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function formatLOINCSearchResponse(response: LOINCSearchResponse): string {
  const lines: string[] = [];
  lines.push("## LOINC Code Search Results\n");
  lines.push(`**Query:** "${response.query}" — **${response.count}** result(s)\n`);

  if (response.codes.length === 0) {
    lines.push("No matching LOINC codes found.");
    return lines.join("\n");
  }

  lines.push("| Code | Name | Class | Type |");
  lines.push("|------|------|-------|------|");
  for (const code of response.codes) {
    lines.push(
      `| \`${code.code}\` | ${code.long_common_name} | ${code.class_name} | ${CLASSTYPE_LABELS[code.class_type] ?? "Unknown"} |`
    );
  }

  return lines.join("\n");
}

const MONEY = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function formatAuditResponse(response: AuditResponse): string {
  const lines: string[] = [];
  lines.push("## Chart Audit\n");

  const totals = response.totals;
  const capabilitiesRun = response.capabilities_run.join(", ") || "(none)";
  lines.push(`**Capabilities run:** ${capabilitiesRun}`);
  lines.push(`**Missed revenue:** ${MONEY(totals.estimated_revenue_recovery)} across ${totals.codes_missed} missed code(s)`);
  lines.push(`**RADV exposure:** ${MONEY(totals.radv_exposure)} across ${totals.codes_unsupported} unsupported code(s)`);
  if (totals.drg_upside > 0) {
    lines.push(`**DRG upside:** ${MONEY(totals.drg_upside)} from ${totals.upgrades_available} upgrade(s)`);
  }
  lines.push(
    `**HCC model:** ${response.rates_used.hcc_model} (rates source: ${response.rates_used.source})\n`,
  );

  if (response.missed.length > 0) {
    lines.push("### Missed codes");
    lines.push("| Code | HCC | Model | RAF | Revenue | Description |");
    lines.push("|------|------|-------|-----|---------|-------------|");
    for (const m of response.missed) {
      const cat = m.hcc_category ?? "non-HCC";
      const model = m.hcc_model ?? "-";
      const raf = m.raf_weight !== undefined ? m.raf_weight.toFixed(3) : "-";
      const rev = m.estimated_revenue !== undefined ? MONEY(m.estimated_revenue) : "-";
      lines.push(`| \`${m.code}\` | ${cat} | ${model} | ${raf} | ${rev} | ${m.description} |`);
    }
    lines.push("");
  }

  if (response.unsupported.length > 0) {
    lines.push("### Unsupported codes (RADV)");
    for (const u of response.unsupported) {
      const risk = u.radv_risk.toUpperCase();
      const exposure = u.estimated_exposure !== undefined ? ` (exposure ${MONEY(u.estimated_exposure)})` : "";
      lines.push(`- **\`${u.code}\`** [${risk}${exposure}]: ${u.description}`);
      lines.push(`  - reason: ${u.reason}`);
      if (u.what_would_support_it) {
        lines.push(`  - would support: ${u.what_would_support_it}`);
      }
    }
    lines.push("");
  }

  if (response.specificity_upgrades.length > 0) {
    lines.push("### Specificity upgrades");
    for (const s of response.specificity_upgrades) {
      const drg = s.drg_impact !== undefined ? ` (DRG impact ${MONEY(s.drg_impact)})` : "";
      lines.push(`- \`${s.from_code}\` -> \`${s.to_code}\`${drg}: ${s.to_description}`);
    }
    lines.push("");
  }

  if (response.denial_risk.length > 0) {
    lines.push("### Denial risk");
    for (const d of response.denial_risk) {
      if (d.risk === "low" && d.reasons.length === 0) continue;
      const reasons = d.reasons.length > 0 ? `: ${d.reasons.join("; ")}` : "";
      lines.push(`- **\`${d.code}\`** [${d.risk.toUpperCase()} p=${d.probability.toFixed(2)}]${reasons}`);
    }
    lines.push("");
  }

  if (response.problem_list && response.problem_list.length > 0) {
    lines.push("### Problem list");
    for (const p of response.problem_list) {
      lines.push(`- \`${p.icd10_code}\` ${p.condition} (${p.status})`);
    }
    lines.push("");
  }

  if (
    response.missed.length === 0 &&
    response.unsupported.length === 0 &&
    response.specificity_upgrades.length === 0 &&
    response.denial_risk.length === 0 &&
    (!response.problem_list || response.problem_list.length === 0)
  ) {
    lines.push("No audit findings.");
  }

  if (response.upgrade_hint) {
    lines.push("");
    lines.push(
      `> **Upgrade:** ${response.upgrade_hint.message} Missing capabilities: ${response.upgrade_hint.denied_capabilities.join(", ")}.`,
    );
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
