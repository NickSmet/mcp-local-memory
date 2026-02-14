# Specification Framework (Project-Specific)

This project follows the **SPEC framework**: specifications are **co-located with the code** they describe, with a small central navigation spine under `docs/`.

## Project Conventions

- **`<docs_root>`**: `docs/`
- **`<backend_root>` (library/server code)**: `src/`
- **`<routes_root>`**: N/A (this project is an MCP server library; tool handlers live in `src/handlers/`)
- **Tests**: `tests/`

## Rules (Summary)

1. **Specs are co-located with code**
   - Module specs live next to the module directory (example: `src/embeddings/SPEC.md`).
2. **Specs describe behavior/contracts, not worklogs**
   - Implementation archaeology and “what changed” notes belong under `docs/work-in-progress/` (or are deleted after promotion).
3. **Keep the navigation spine current**
   - `docs/SPEC-INDEX.md` is the authoritative index for all specs and feature docs.
4. **External contracts are explicit**
   - Upstream APIs live in `docs/external-apis/` and are linked from any dependent spec.

## Navigation Spine

```
docs/
├── SPEC-INDEX.md
├── ARCHITECTURE.md
├── LLM-CONTEXT.md
├── SPEC-FRAMEWORK.md
├── external-apis/
├── features/
└── work-in-progress/
```

## Where to Put What

- **Module behavior/contracts**: `src/**/SPEC.md`
- **Cross-cutting feature quick references**: `docs/features/*.md`
- **Drafts / WIP / historical analysis**: `docs/work-in-progress/**`

