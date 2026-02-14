# MCP Local Memory — Architecture

This is the **system-level overview**. Detailed behavior/contracts live in co-located specs:

- `src/SPEC.md`
- `src/handlers/SPEC.md`
- `src/embeddings/SPEC.md`

**Status:** ✅ Complete

## High-Level Architecture

```mermaid
graph TB
  Client[MCP Client] <--> Server[MCP Server]
  Server <--> SQLite[(SQLite DB)]

  Server --> OpenAI[OpenAI API (optional)]
  Server --> LocalModels[Local models (optional)]

  subgraph "Server Modules (src/)"
    Handlers[handlers/*]
    Ops[operations.ts]
    DB[database.ts]
    Emb[embeddings/*]
  end
```

## Core Concepts

- **Memory**: user-provided text + tags, stored in SQLite.
- **Facts**: atomic statements derived from memory text (OpenAI mode) or provided manually (local mode).
- **Embeddings**: vectors for facts and queries used for semantic search.
- **Direct-access-only memories**: stored but intentionally **non-searchable** (see `docs/features/direct-access-only.md`).

## Main Flows (Conceptual)

### Add memory

1. Persist memory text and tags.
2. If `direct_access_only: true`:
   - Skip fact extraction and embeddings.
3. Else:
   - Create facts (AI-extracted or user-provided)
   - Embed facts and store vectors

### Search memory

1. Embed the query.
2. Search over fact embeddings.
3. Return the best matching facts and their parent memories.
4. **Direct-access-only memories are excluded by contract.**

### List / get memory

- `list_memories` returns **truncated previews**; use `get_memory(id)` for full text.
- `list_memories({ direct_access_only: true })` lists only direct-access-only memories (also truncated previews).

## External Contracts

- OpenAI assumptions: `docs/external-apis/openai.md`

