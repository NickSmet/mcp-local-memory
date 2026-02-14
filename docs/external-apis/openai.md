# OpenAI API Contract (Upstream)

**Purpose:** This project depends on OpenAI APIs for **fact extraction** (chat/completions) and **embeddings** when `OPENAI_API_KEY` is configured.

**Status:** ✅ Complete

## Used Capabilities

### 1) Embeddings

- **Used for:** semantic search vectors for facts; query embeddings for search
- **Client library:** `openai` npm package

**Inputs (conceptual):**
- Text inputs (facts or queries)
- Model name (configured; default is typically `text-embedding-3-small`)

**Outputs (conceptual):**
- A numeric vector per input text (fixed dimension for a given model)

**Error semantics (relevant):**
- **401/403**: invalid/unauthorized API key → client should treat as “OpenAI mode not available”
- **429**: rate limit/quota → client may fall back to local embeddings (see `switch_embedding_mode`)
- **5xx / network**: transient failures → retry/backoff or switch mode

### 2) Fact Extraction (Chat)

- **Used for:** splitting a memory text into multiple “facts” (OpenAI mode only)
- **Client library:** `openai` npm package

**Inputs (conceptual):**
- System + user prompt describing extraction rules
- Memory text
- Model name (configured; commonly lightweight chat model)

**Outputs (conceptual):**
- JSON list of strings (facts)

**Error semantics (relevant):**
- Same classes as above (auth/rate-limit/transient)
- Output may be malformed → caller must validate and fall back to safe defaults

## Data Handling Notes

- In OpenAI mode, **memory text is sent to OpenAI** for fact extraction and embeddings.
- In local mode, **no external calls** are made (but local models may be downloaded on first use).

## Related Specs

- `src/SPEC.md`
- `src/embeddings/SPEC.md`

