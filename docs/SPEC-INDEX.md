# Specification Index

**Purpose:** Quick reference to all specs and feature docs in this repo.  
**Last updated:** 2026-02-14

---

## Central Docs (docs/)

| Document | Purpose |
|----------|---------|
| `docs/LLM-CONTEXT.md` | Fast onboarding for new LLM/dev sessions |
| `docs/ARCHITECTURE.md` | High-level system overview |
| `docs/SPEC-FRAMEWORK.md` | Documentation rules and conventions (this repo) |
| `docs/external-apis/openai.md` | Upstream OpenAI contract relied on by this project |

---

## Feature Quick References (docs/features/)

| Feature Doc | What it covers | Status |
|-------------|----------------|--------|
| `docs/features/direct-access-only.md` | Direct-access-only memories (non-searchable storage mode) | ✅ Complete |
| `docs/features/system-prompt-template.md` | Prompt guidance for MCP clients/agents | ✅ Complete |

---

## Co-located Module Specs (src/)

| Spec | Domain | Status |
|------|--------|--------|
| `src/SPEC.md` | Public behavior & tool contracts (MCP memory server) | ✅ Complete |
| `src/handlers/SPEC.md` | Tool handler contracts & error semantics | ✅ Complete |
| `src/embeddings/SPEC.md` | Embedding modes, switching, and invariants | ✅ Complete |

---

## Work in Progress (docs/work-in-progress/)

| Document/Folder | Purpose | Status |
|----------------|---------|--------|
| `docs/work-in-progress/_archive/` | Archived historical notes from earlier iterations | ✅ Complete |

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete - ready for reference |
| 🔶 | Outline - structure defined, needs detail |
| ⬜ | Planned - not started |

