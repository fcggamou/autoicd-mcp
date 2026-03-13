# AutoICD MCP Server

> Give AI assistants the power of medical coding — ICD-10-CM and ICD-11 diagnosis coding, code search, crosswalk, and PHI de-identification via the [AutoICD API](https://autoicdapi.com).

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants like **Claude Desktop**, **Cursor**, **VS Code**, and **Windsurf** to the AutoICD API for automated ICD-10 and ICD-11 medical coding.

## Why AutoICD API?

| Feature | Details |
|---------|---------|
| **AI-Powered Coding** | Clinical text → ICD-10-CM or ICD-11 codes with NLP entity extraction |
| **74,000+ ICD-10 Codes** | Full ICD-10-CM 2025 code set with descriptions and hierarchy |
| **ICD-11 Support** | Search and look up ICD-11 codes with full ICD-10 ↔ ICD-11 crosswalk |
| **Negation Detection** | Identifies negated, historical, uncertain, and family history mentions |
| **Confidence Scoring** | High/moderate confidence labels with cosine similarity scores |
| **Spell Correction** | Handles misspelled medical terms automatically |
| **PHI De-identification** | HIPAA-compliant removal of names, dates, SSNs, and more |
| **Code Search** | Full-text search across all ICD-10-CM codes and descriptions |
| **SNOMED CT & UMLS** | Cross-references and synonyms from standard medical terminologies |

Get your API key at **[autoicdapi.com](https://autoicdapi.com)**.

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autoicd": {
      "command": "npx",
      "args": ["-y", "autoicd-mcp"],
      "env": {
        "AUTOICD_API_KEY": "sk_your_api_key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "autoicd": {
      "command": "npx",
      "args": ["-y", "autoicd-mcp"],
      "env": {
        "AUTOICD_API_KEY": "sk_your_api_key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "autoicd": {
      "command": "npx",
      "args": ["-y", "autoicd-mcp"],
      "env": {
        "AUTOICD_API_KEY": "sk_your_api_key"
      }
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "autoicd": {
      "command": "npx",
      "args": ["-y", "autoicd-mcp"],
      "env": {
        "AUTOICD_API_KEY": "sk_your_api_key"
      }
    }
  }
}
```

## Available Tools

### `code_diagnosis`

Extract medical diagnoses from clinical text and map them to ICD-10-CM codes.

**Parameters:**
- `text` (required) — Clinical text to process (progress notes, discharge summaries, etc.)
- `top_k` (optional, 1-25, default: 5) — Number of top ICD-10 candidates per entity
- `include_negated` (optional, default: true) — Include negated entities in results

**Example prompts:**
- _"Code this note: Patient presents with acute lower back pain radiating to the left leg. Denies any numbness or tingling."_
- _"What ICD-10 codes apply to: 65-year-old male with type 2 diabetes, hypertension, and chronic kidney disease stage 3"_
- _"Code the following discharge summary: Patient admitted for COPD exacerbation with acute respiratory failure. History of CHF and atrial fibrillation."_

The tool will extract medical entities, detect negations ("denies numbness"), and return ranked ICD-10 code candidates with confidence scores.

### `search_codes`

Search the ICD-10-CM 2025 code set by description.

**Parameters:**
- `query` (required) — Search text to match against code descriptions
- `limit` (optional, 1-100, default: 20) — Maximum results
- `offset` (optional, default: 0) — Pagination offset

**Example prompts:**
- _"Search for ICD-10 codes related to congestive heart failure"_
- _"Find all ICD-10 codes for diabetes"_
- _"What ICD-10 codes are there for anxiety disorders?"_
- _"Look up hypertension ICD-10 codes"_

### `get_code`

Get comprehensive details for a specific ICD-10-CM code.

**Parameters:**
- `code` (required) — ICD-10-CM code (e.g., "E11.9", "I10", "J44.1")

**Example prompts:**
- _"Look up the details for ICD-10 code M54.5"_
- _"What does ICD-10 code I10 mean?"_
- _"Is E11.9 a billable code? What are its synonyms?"_
- _"Show me the SNOMED CT mappings for code J44.1"_

Returns descriptions, billable status, SNOMED CT and UMLS synonyms, parent/child hierarchy, chapter classification, and ICD-11 crosswalk mappings.

### `search_icd11_codes`

Search the ICD-11 code set by description.

**Parameters:**
- `query` (required) — Search text to match against ICD-11 code descriptions
- `limit` (optional, 1-100, default: 10) — Maximum results

**Example prompts:**
- _"Search for ICD-11 codes related to diabetes"_
- _"Find ICD-11 codes for respiratory infections"_
- _"What are the ICD-11 codes for anxiety disorders?"_

### `get_icd11_code`

Get comprehensive details for a specific ICD-11 code, including ICD-10 crosswalk mappings.

**Parameters:**
- `code` (required) — ICD-11 code (e.g., "5A11", "BA00", "CA40.0")

**Example prompts:**
- _"Look up ICD-11 code 5A11"_
- _"What is the ICD-10 equivalent of ICD-11 code BA00?"_
- _"Show me the details and crosswalk for ICD-11 code CA40.0"_

Returns descriptions, Foundation URI, synonyms, parent/child hierarchy, chapter classification, and ICD-10 crosswalk mappings.

### `anonymize`

De-identify Protected Health Information (PHI) in clinical text.

**Parameters:**
- `text` (required) — Clinical text containing PHI

**Example prompts:**
- _"Remove all patient identifiers from this note: John Smith (DOB 03/15/1980) was seen at 123 Main St..."_
- _"De-identify this clinical text before I share it: Maria Garcia, MRN 789012, SSN 123-45-6789, diagnosed with pneumonia"_

Detects and replaces names, dates, SSNs, phone numbers, emails, addresses, MRNs, and ages with type labels like `[NAME]`, `[DATE]`, `[SSN]`.

## Common ICD-10 Codes

Here are some of the most commonly coded conditions you can look up with this MCP server:

| Condition | Code | Description |
|-----------|------|-------------|
| [Hypertension](https://autoicdapi.com/icd10/condition/hypertension) | I10 | Essential (primary) hypertension |
| [Type 2 Diabetes](https://autoicdapi.com/icd10/condition/diabetes) | E11.9 | Type 2 diabetes mellitus without complications |
| [Anxiety](https://autoicdapi.com/icd10/condition/anxiety) | F41.1 | Generalized anxiety disorder |
| [Depression](https://autoicdapi.com/icd10/condition/depression) | F32.9 | Major depressive disorder, single episode |
| [Low Back Pain](https://autoicdapi.com/icd10/condition/back-pain) | M54.5 | Low back pain |
| [COPD](https://autoicdapi.com/icd10/condition/copd) | J44.9 | Chronic obstructive pulmonary disease |
| [Heart Failure](https://autoicdapi.com/icd10/condition/heart-failure) | I50.9 | Heart failure, unspecified |
| [UTI](https://autoicdapi.com/icd10/condition/urinary-tract-infection) | N39.0 | Urinary tract infection |
| [Pneumonia](https://autoicdapi.com/icd10/condition/pneumonia) | J18.9 | Pneumonia, unspecified organism |
| [Atrial Fibrillation](https://autoicdapi.com/icd10/condition/atrial-fibrillation) | I48.91 | Unspecified atrial fibrillation |

Browse the full [ICD-10-CM Code Directory](https://autoicdapi.com/icd10) or find codes by [condition](https://autoicdapi.com/icd10/condition).

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `AUTOICD_API_KEY` | Yes | Your AutoICD API key (starts with `sk_`) |
| `AUTOICD_BASE_URL` | No | Custom API base URL (default: `https://autoicdapi.com`) |

## Use Cases

- **EHR/EMR Integration** — Automate diagnosis coding in electronic health record workflows
- **Medical Billing** — Accelerate revenue cycle management with AI-assisted code assignment
- **Clinical Decision Support** — Look up ICD-10 codes and hierarchies during clinical documentation
- **Health-Tech Development** — Build and test medical coding features with live API access in your IDE
- **Research & Analytics** — Search and explore the ICD-10-CM code set for epidemiological analysis
- **Compliance** — De-identify clinical text before processing or sharing

## Requirements

- Node.js 18+
- An AutoICD API key — **[Get one free at autoicdapi.com](https://autoicdapi.com)**

## Links

- **AutoICD API** — [autoicdapi.com](https://autoicdapi.com)
- **API Documentation** — [autoicdapi.com/docs](https://autoicdapi.com/docs)
- **ICD-10-CM Code Directory** — [autoicdapi.com/icd10](https://autoicdapi.com/icd10) — Browse all 74,000+ codes
- **ICD-11 Code Directory** — [autoicdapi.com/icd11](https://autoicdapi.com/icd11) — Browse the WHO ICD-11 MMS hierarchy
- **ICD-10 ↔ ICD-11 Crosswalk** — [autoicdapi.com/icd10-to-icd11](https://autoicdapi.com/icd10-to-icd11) — Map codes between revisions
- **ICD-10 Codes by Condition** — [autoicdapi.com/icd10/condition](https://autoicdapi.com/icd10/condition) — Find codes for common conditions
- **TypeScript SDK** — [npmjs.com/package/autoicd](https://www.npmjs.com/package/autoicd)
- **Python SDK** — [pypi.org/project/autoicd](https://pypi.org/project/autoicd/)
- **SNOMED CT & UMLS Cross-References** — [autoicdapi.com/snomed-ct-umls](https://autoicdapi.com/snomed-ct-umls)
- **ICD-10-CM Reference** — [CMS.gov](https://www.cms.gov/medicare/coding-billing/icd-10-codes)

## License

MIT
