# Handlers — Specification

## Overview

Handlers implement the **public MCP tool contracts** by validating inputs, invoking core operations, and formatting responses.

This spec complements `src/SPEC.md` by defining **handler-level behavior**, especially validation and error semantics.

## Responsibilities

- Validate tool arguments (types, required fields, bounds).
- Enforce behavioral invariants:
  - **Direct-access-only memories are non-searchable**
  - **Direct-access-only memory text cannot be updated**
  - `list_memories` returns **truncated previews**
- Map internal errors into clear user-facing errors.

## Tool Semantics (High Signal)

### `add_memory`

- If `direct_access_only: true`:
  - Must not call fact extraction.
  - Must not call embedding.
  - Must create the memory with tags and return success.

### `search_memory`

- Must exclude direct-access-only memories by contract (even if tags match).

### `list_memories`

- Must return only one “type” per call:
  - Default: normal memories only
  - With `direct_access_only: true`: direct-access-only memories only
- Must truncate `text` for **every** returned memory preview.

### `get_memory`

- Returns full text and facts (if any).

### `update_memory`

- Tag-only updates (`add_tags`/`remove_tags`) are permitted for both memory types.
- Full text updates:
  - Normal memories: allowed.
  - Direct-access-only: **blocked with a clear error** explaining delete+recreate.

## Error Handling

Errors must be actionable:

- **Bad inputs**: explain which field is invalid/missing.
- **Forbidden operation** (direct-access text update): explain safe alternatives.
- **OpenAI failures**: include short guidance (switch mode, retry, etc.) without leaking secrets.

## Related Specifications

- `src/SPEC.md`
- `src/embeddings/SPEC.md`

## Status

**✅ Complete**

