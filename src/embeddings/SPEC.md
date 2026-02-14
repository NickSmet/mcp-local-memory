# Embeddings — Specification

## Overview

This module provides **embeddings for facts and queries**. It supports multiple embedding modes and a mode-switching workflow.

**Key principle:** embedding mode changes must not violate core invariants (especially direct-access-only non-searchability).

## Embedding Modes

### OpenAI mode

- Enabled when `OPENAI_API_KEY` is available.
- Used for:
  - Fact extraction (where applicable)
  - Embeddings for facts and queries

### Local modes

- Used when OpenAI is not configured or when switching offline.
- Requires manual facts (no AI fact extraction).

## Mode Switching

Mode switching is a supported operation:

- New content should be embedded using the **current mode**.
- Existing facts may be missing embeddings for the target mode; backfill may occur.

### Invariants during switching

- **Direct-access-only memories must not become searchable**.
  - Any “facts missing embeddings” backfill must exclude facts belonging to direct-access-only memories.

## Dimensions / Storage (Conceptual)

- Each embedding mode has a fixed dimension.
- Embeddings are persisted in mode-specific storage (tables) and used by search.

## Error Semantics

- OpenAI auth/quota/network failures should be treated as recoverable:
  - Recommend switching to local mode when appropriate.
- Validation should make mode selection explicit and predictable.

## Related Specifications

- `src/SPEC.md`
- `docs/external-apis/openai.md`

## Status

**✅ Complete**

