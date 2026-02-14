# Embedding Cleanup Analysis

## Current Status: ✅ CORRECT IMPLEMENTATION

The multi-mode embedding system properly handles cleanup across all embedding tables via SQL CASCADE constraints.

---

## Database Schema

### Cascade Delete Chain

```
memories (deleted)
    ↓ ON DELETE CASCADE
facts (deleted)
    ↓ ON DELETE CASCADE
fact_vectors_openai (deleted)
fact_vectors_local_en (deleted)
fact_vectors_local_ml (deleted)
```

### Schema Definitions

```sql
-- Facts cascade from memories
CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  ...
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- All embedding tables cascade from facts
CREATE TABLE fact_vectors_openai (
  fact_id TEXT PRIMARY KEY,
  ...
  FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);

CREATE TABLE fact_vectors_local_en (
  fact_id TEXT PRIMARY KEY,
  ...
  FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);

CREATE TABLE fact_vectors_local_ml (
  fact_id TEXT PRIMARY KEY,
  ...
  FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);
```

---

## Scenarios Analysis

### ✅ Scenario 1: Memory Deleted

**What happens:**
```
1. deleteMemory(memoryId) is called
2. DELETE FROM memories WHERE id = memoryId
3. CASCADE triggers:
   → facts table: all facts with memory_id deleted
   → fact_vectors_openai: all embeddings for those facts deleted
   → fact_vectors_local_en: all embeddings for those facts deleted
   → fact_vectors_local_ml: all embeddings for those facts deleted
```

**Code:** `src/operations.ts` line 429-439
```typescript
export function deleteMemory(memoryId: string, contextId: string): boolean {
  const memory = getMemory(memoryId);
  if (!memory || memory.contextId !== contextId) {
    return false;
  }
  const result = stmt.run(memoryId);
  return result.changes > 0;
}
```

**Status:** ✅ **CORRECT** - SQL CASCADE handles cleanup across ALL embedding tables

---

### ✅ Scenario 2: Memory Updated (Text Changed)

**What happens:**
```
1. handleUpdateMemory() is called with new text
2. deleteFactsForMemory(memoryId) explicitly deletes old facts
3. CASCADE triggers:
   → fact_vectors_openai: embeddings for old facts deleted
   → fact_vectors_local_en: embeddings for old facts deleted
   → fact_vectors_local_ml: embeddings for old facts deleted
4. New facts are created with embeddings ONLY in current mode's table
```

**Code:** `src/handlers/update-memory.ts` line 112-113
```typescript
// Delete old facts
deleteFactsForMemory(memory_id);
```

**Code:** `src/operations.ts` line 420-424
```typescript
export function deleteFactsForMemory(memoryId: string): number {
  const stmt = db.prepare(`DELETE FROM facts WHERE memory_id = ?`);
  const result = stmt.run(memoryId);
  return result.changes;
}
```

**Status:** ✅ **CORRECT** - Old embeddings deleted from ALL tables, new embeddings only in active mode

---

### ✅ Scenario 3: Memory Updated (Tags Only)

**What happens:**
```
1. handleUpdateMemory() called with add_tags/remove_tags only
2. updateMemoryTags() updates memory.tags JSON field
3. Facts unchanged
4. Embeddings unchanged (across all tables)
```

**Code:** `src/handlers/update-memory.ts` line 24-71

**Status:** ✅ **CORRECT** - No fact/embedding changes, efficient update

---

### ✅ Scenario 4: Mode Switching

**What happens:**
```
1. User switches from OpenAI → Local
2. Facts remain unchanged
3. Existing embeddings remain in fact_vectors_openai
4. Missing embeddings are created in fact_vectors_local_ml
5. Both tables now have embeddings for all facts

Later, if user switches back:
6. Existing embeddings in fact_vectors_openai are reused
7. No re-embedding needed
```

**Code:** `src/embeddings/factory.ts` switchEmbeddingMode()
- Uses getFactsMissingEmbeddings() to find facts without embeddings in target mode
- Only embeds missing facts
- Preserves existing embeddings in other modes

**Status:** ✅ **CORRECT** - Efficient mode switching, no orphaned data

---

### ✅ Scenario 5: Delete All Memories

**What happens:**
```
1. deleteAllMemories(contextId) is called
2. DELETE FROM memories WHERE context_id = contextId
3. CASCADE triggers for all memories:
   → All facts deleted
   → All embeddings deleted from ALL tables
```

**Code:** `src/operations.ts` line 444-448
```typescript
export function deleteAllMemories(contextId: string): number {
  const stmt = db.prepare(`DELETE FROM memories WHERE context_id = ?`);
  const result = stmt.run(contextId);
  return result.changes;
}
```

**Status:** ✅ **CORRECT** - Complete cleanup across all tables

---

## Edge Cases

### ✅ Edge Case 1: Fact Directly Deleted

**Scenario:** If a fact is deleted directly (not currently exposed via MCP tools)
```typescript
db.prepare(`DELETE FROM facts WHERE id = ?`).run(factId);
```

**Result:** CASCADE will delete embeddings from ALL tables

**Status:** ✅ **PROTECTED** - Even if this were exposed, cleanup would work

---

### ✅ Edge Case 2: Multiple Mode Switches

**Scenario:** User switches OpenAI → Local → OpenAI → Local → OpenAI

**Result:**
- First switch: Local embeddings created, OpenAI preserved
- Second switch: OpenAI reused (no re-embed), Local preserved
- Third switch: Local reused (no re-embed), OpenAI preserved
- All embeddings accumulate but stay in sync

**Status:** ✅ **CORRECT** - No orphaned data, efficient reuse

---

### ✅ Edge Case 3: Partial Embedding Failure

**Scenario:** Mode switch starts, embeds 100 facts, then fails

**Result:**
- 100 facts have embeddings in new mode
- Remaining facts missing embeddings in new mode
- Next operation (add/update) will show error: "X facts need re-embedding"
- User can switch again to complete

**Status:** ✅ **SAFE** - Partial state is detectable and recoverable

---

## Verification Queries

### Check for Orphaned Embeddings

```sql
-- OpenAI embeddings without facts (should be 0)
SELECT COUNT(*) FROM fact_vectors_openai v
LEFT JOIN facts f ON v.fact_id = f.id
WHERE f.id IS NULL;

-- Local EN embeddings without facts (should be 0)
SELECT COUNT(*) FROM fact_vectors_local_en v
LEFT JOIN facts f ON v.fact_id = f.id
WHERE f.id IS NULL;

-- Local ML embeddings without facts (should be 0)
SELECT COUNT(*) FROM fact_vectors_local_ml v
LEFT JOIN facts f ON v.fact_id = f.id
WHERE f.id IS NULL;
```

### Check for Facts Without Parent Memory

```sql
-- Facts without memories (should be 0)
SELECT COUNT(*) FROM facts f
LEFT JOIN memories m ON f.memory_id = m.id
WHERE m.id IS NULL;
```

---

## Summary

### ✅ All Scenarios Handled Correctly

1. **Memory Deleted** → Facts + All Embeddings deleted (CASCADE)
2. **Memory Updated** → Old Facts + All Old Embeddings deleted, New Embeddings in current mode only
3. **Tags Updated** → No changes to facts/embeddings
4. **Mode Switched** → Embeddings added only where missing, existing preserved
5. **Delete All** → Complete cleanup via CASCADE

### Key Design Principles

1. **SQL CASCADE** handles cleanup automatically - no manual tracking needed
2. **Single source of truth** - `facts` table drives all embedding tables
3. **Efficient mode switching** - Only embed what's missing, reuse existing
4. **No orphaned data** - Foreign keys with CASCADE prevent stranded embeddings
5. **Accumulative embeddings** - Facts can have embeddings in multiple modes simultaneously

### No Issues Found

The current implementation is **correct and robust**. All cleanup scenarios are handled properly via SQL CASCADE constraints.

---

## Recommendations

### Optional: Add Verification Function

For peace of mind, could add a maintenance function to verify no orphaned embeddings:

```typescript
export function verifyEmbeddingIntegrity(): {
  orphanedOpenAI: number;
  orphanedLocalEN: number;
  orphanedLocalML: number;
  orphanedFacts: number;
} {
  const results = {
    orphanedOpenAI: db.prepare(`
      SELECT COUNT(*) as count FROM fact_vectors_openai v
      LEFT JOIN facts f ON v.fact_id = f.id
      WHERE f.id IS NULL
    `).get().count,
    orphanedLocalEN: db.prepare(`
      SELECT COUNT(*) as count FROM fact_vectors_local_en v
      LEFT JOIN facts f ON v.fact_id = f.id
      WHERE f.id IS NULL
    `).get().count,
    orphanedLocalML: db.prepare(`
      SELECT COUNT(*) as count FROM fact_vectors_local_ml v
      LEFT JOIN facts f ON v.fact_id = f.id
      WHERE f.id IS NULL
    `).get().count,
    orphanedFacts: db.prepare(`
      SELECT COUNT(*) as count FROM facts f
      LEFT JOIN memories m ON f.memory_id = m.id
      WHERE m.id IS NULL
    `).get().count,
  };
  return results;
}
```

But this is **optional** - the current CASCADE implementation is sufficient.

---

**Analysis Date:** 2025-11-16  
**Status:** ✅ NO ISSUES - Implementation is correct  
**Action Required:** None - system working as designed




