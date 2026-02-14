# Agent Guidelines (Project-Specific)

This repo uses the **SPEC framework**. Read `docs/LLM-CONTEXT.md` first, then follow `docs/SPEC-INDEX.md`.

## Project Purpose

`mcp-local-memory` is an MCP server that provides **persistent memory** backed by **SQLite** with **semantic search** over facts using embeddings (OpenAI or local), plus context tagging and context isolation.

## Repo Layout

| Path | Purpose |
|------|---------|
| `src/` | Implementation (MCP server, handlers, operations, embeddings, DB) |
| `tests/` | Integration-style tests |
| `docs/` | Documentation spine (index, architecture, features, external contracts) |
| `examples/` | Example configuration files for MCP clients |
| `dist/` | Build output (published artifact) |

## Spec Location Conventions (Do Not Skip)

- **Docs root:** `docs/`
- **Co-located specs:** `src/**/SPEC.md`
  - System/tool contracts: `src/SPEC.md`
  - Handler semantics: `src/handlers/SPEC.md`
  - Embedding modes: `src/embeddings/SPEC.md`
- **Cross-cutting feature refs:** `docs/features/*.md`
- **External contracts:** `docs/external-apis/*.md`
- **WIP + archive:** `docs/work-in-progress/**`

## Build / Dev / Test Commands

```bash
npm run build        # compile TypeScript to dist/
npm run dev          # run locally (tsx)
npm run start:stdio  # run MCP server over stdio
npm start            # run SSE via mcp-proxy
npm test             # this repo currently treats build as test
```

## Environment Variables / Configuration Policy

- **Prefer MCP client configuration** to supply env vars (especially `OPENAI_API_KEY`).
- **High-signal env vars:**
  - `OPENAI_API_KEY`: enables OpenAI mode
  - `SQLITE_PATH`: DB location
  - `CONTEXT_ID`: isolates memory spaces
  - `LANGUAGE_MODE`: local embedding selection

## Coding Conventions / Critical Patterns

- **Do not break invariants**:
  - Direct-access-only memories must not become searchable.
  - `list_memories` must return truncated previews; full text via `get_memory`.
- **Spec + code change together**:
  - If behavior changes, update the relevant `SPEC.md` in the same change.
  - Avoid worklogs in `SPEC.md` (use `docs/work-in-progress/` for exploration).

## Known Gotchas

- Local embedding modes require a one-time model download (expected latency on first use).
- OpenAI failures (auth/quota/rate-limit) should suggest switching to local mode where applicable.

## Review Expectations

- Update `docs/SPEC-INDEX.md` when adding/removing specs or feature docs.
- Keep docs discoverable: no root-level “random” markdown; archive into `docs/work-in-progress/_archive/`.

