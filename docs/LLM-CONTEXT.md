# Quick Context for LLM Sessions

**Purpose:** Fast onboarding for new sessions. Start here, then follow `docs/SPEC-INDEX.md`.

## What This Project Does

`mcp-local-memory` is a **Model Context Protocol (MCP)** server that stores “memories” in **SQLite**, supports **semantic search** via embeddings, and supports **tagging** and **multi-context isolation**.

## Tech Stack

- **Language/runtime:** TypeScript (Node.js, ESM)
- **Storage:** SQLite (`better-sqlite3`)
- **Embeddings:** OpenAI (optional) or local models (`@xenova/transformers`)
- **Protocol:** MCP tools over stdio; optional SSE via `mcp-proxy`

## Key Paths

| Path | Purpose |
|------|---------|
| `src/` | Implementation (server, operations, DB, embeddings, handlers) |
| `src/handlers/` | MCP tool handlers (`add_memory`, `search_memory`, etc.) |
| `src/embeddings/` | Embedder implementations + embedding mode switching |
| `docs/` | Documentation spine and feature quick references |
| `tests/` | Integration-style tests for key behaviors |

## Documentation (Read Order)

1. `docs/SPEC-INDEX.md` (map of everything)
2. `src/SPEC.md` (public behavior + tool contracts)
3. `src/handlers/SPEC.md` (handler-level contract details + error semantics)
4. `src/embeddings/SPEC.md` (embedding mode behavior)
5. `docs/external-apis/openai.md` (OpenAI assumptions/contracts)

## Core Behaviors to Remember

- `search_memory` **never** returns direct-access-only memories.
- `list_memories` returns **truncated previews**; use `get_memory(id)` for full text.
- Embedding mode can be switched (`switch_embedding_mode`), and missing embeddings may be backfilled depending on mode.

## Commands

```bash
npm run build        # compile TypeScript to dist/
npm run dev          # run locally (tsx)
npm run start:stdio  # run MCP server over stdio
npm start            # run SSE via mcp-proxy (port defined in package.json)
npm test             # this repo uses build-as-test
```

## Environment Variables (High Signal)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables OpenAI mode (fact extraction + embeddings) |
| `SQLITE_PATH` | SQLite DB file path |
| `CONTEXT_ID` | Namespaces memories into separate “spaces” |
| `LANGUAGE_MODE` | Local embedding mode selection (`en` / `multilang`) |

