# MCP Local Memory (MCP Server) — Specification

## Overview

This project provides an **MCP memory server** that stores memories in **SQLite**, supports **semantic search** over facts using embeddings, and supports **context tags** and **context isolation**.

**Key principle:** keep memory retrieval useful by indexing **atomic facts**, not entire narratives.

## Architecture (Conceptual)

```
MCP Client
  │ tools/call
  ▼
Handlers (src/handlers/*)
  ▼
Operations (src/operations.ts)
  ▼
SQLite (src/database.ts)
  ▲
Embeddings (src/embeddings/*)  ← OpenAI or local models
```

## Public Tools (Contracts)

This server exposes MCP tools (names are stable API). Detailed handler semantics live in `src/handlers/SPEC.md`.

### `add_memory`

- **Input**:
  - `text` (string, required)
  - `context_tags` (string[], optional)
  - `facts` (string[], optional; ignored when `direct_access_only: true`)
  - `direct_access_only` (boolean, optional; default false)
- **Behavior**:
  - If `direct_access_only: true`, store memory text + tags, **do not** extract facts, **do not** embed.
  - Else, store memory, create facts (AI-extracted or provided), embed facts, store vectors.

### `search_memory`

- **Input**: `query` (string), `limit` (number), `context_tags` (string[] optional boost)
- **Behavior**:
  - Embeds the query and returns best-matching facts/memories.
  - **Never returns direct-access-only memories.**

### `list_memories`

- **Input**: `limit` (number), `context_tags` (string[] optional), `direct_access_only` (boolean optional)
- **Behavior**:
  - Lists memories chronologically.
  - **Text is always truncated** to ~200 characters in list responses; use `get_memory(id)` for full content.
  - Default listing returns only **normal** memories; set `direct_access_only: true` to list only direct-access memories.

### `get_memory`

- **Input**: `memory_id` (string)
- **Behavior**:
  - Returns full memory text and associated facts (if any).
  - Works for both normal and direct-access-only memories.

### `update_memory`

- **Input**:
  - Full update: `memory_id`, `text`, optional `context_tags`, optional `facts`
  - Tag-only update: `memory_id`, `add_tags`/`remove_tags`
- **Behavior**:
  - **Direct-access-only** memories: tag-only updates are allowed; **text updates are blocked** (delete + recreate to change content).
  - Normal memories: updates may regenerate facts/embeddings depending on mode.

### `delete_memory`

- **Behavior**: permanently removes a memory and associated facts/vectors.

### `get_context_tags`

- Returns available tags (from normal memories only; direct-access-only memories do not pollute tag discovery).

### Tool-call notes (if enabled)

- Tools like `record_tool_call_note`, `get_tool_call_notes`, etc. allow recording usage learnings.

## Core Data Concepts

### Memory

A “memory” is the primary stored unit:

- id (short stable identifier)
- `context_id` (namespaces separate memory spaces)
- `text`
- `tags` (string[])
- `direct_access_only` (boolean)

### Facts

Facts are atomic statements extracted from memory text (OpenAI mode) or provided manually.

**Invariant:** direct-access-only memories must have **no searchable facts/embeddings** created by the server.

## Configuration (Behavioral)

### Context isolation (`CONTEXT_ID`)

All reads/writes are scoped to a context ID to prevent cross-project leakage.

### Embedding mode

Embedding mode can be OpenAI-backed or local-model-backed. Mode switching is a supported behavior (see `src/embeddings/SPEC.md`).

## Error Semantics (High Level)

- Invalid inputs should fail fast with clear error messages.
- OpenAI errors (auth/quota/network) may trigger recommendations to switch to local embeddings.
- Operations must preserve invariants (especially around direct-access-only non-searchability).

## Status

**✅ Complete** — this spec defines public tool contracts and critical invariants. For detailed per-tool behavior and validation, see:

- `src/handlers/SPEC.md`
- `src/embeddings/SPEC.md`

