# Direct-Access-Only Memories

**Status:** ✅ Complete  
**Purpose:** Store large reference data (JSON configs, API responses, logs) without polluting semantic search.

## Overview

Direct-access-only memories are a **storage mode** for memories that:

- **Skip fact extraction and embeddings**
- **Never appear in `search_memory` results**
- **Never appear in default `list_memories` results**
- Are still **retrievable by ID** via `get_memory(id)`
- Are **listable** only via `list_memories({ direct_access_only: true })` (as truncated previews)

## Quick Reference (User/Agent Behavior)

### Create

- Use `add_memory({ ..., direct_access_only: true })`
- `context_tags` still work for organization

### Find again later

- Use `list_memories({ direct_access_only: true, context_tags?: [...] })` to recover IDs (preview/truncated)
- Use `get_memory(id)` to retrieve **full content**

### Immutability / Safety

- Direct-access-only is **immutable** after creation:
  - **Tags can be updated**
  - **Text updates are blocked** (must delete + recreate to change content)

## Behavior Matrix

| Operation | Normal Memories | Direct-Access-Only Memories |
|-----------|----------------|-----------------------------|
| `add_memory` | facts extracted/embedded (mode-dependent) | **no facts / no embeddings** |
| `search_memory` | ✅ returns | ❌ never returns |
| `list_memories()` | ✅ returns **truncated preview** | ❌ not returned |
| `list_memories({ direct_access_only: true })` | ❌ not returned | ✅ returns **truncated preview** |
| `get_memory(id)` | ✅ full text | ✅ full text |
| `update_memory(text=...)` | ✅ allowed | ❌ blocked |
| `update_memory(add_tags/remove_tags)` | ✅ allowed | ✅ allowed |

## Where This Is Specified

- Tool-level public contract: `src/SPEC.md`
- Handler error semantics: `src/handlers/SPEC.md`
- Database/operations invariants: `src/SPEC.md`

## Testing

Relevant tests live in `tests/` (search for “direct access” scenarios).

