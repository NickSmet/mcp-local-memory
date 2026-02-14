# Direct-Access-Only Memories - Edge Cases Analysis

## Summary

✅ **CONFIRMED**: Direct-access memories **CANNOT** be converted to searchable memories through any API operation.

## Edge Cases Analyzed & Fixed

### 1. ✅ Tag-Only Updates (SAFE - No Changes Needed)

**Behavior**: Adding or removing tags on a direct-access memory
**Status**: ✅ **SAFE** - Works correctly

```javascript
await update_memory({
  memory_id: "abc123",
  add_tags: ["new-tag"],
  remove_tags: ["old-tag"]
});
```

**What Happens**:
- Only modifies the `tags` JSON field in database
- Does NOT touch `direct_access_only` column
- Does NOT create or modify facts
- Memory remains direct-access-only

**Code**: `src/handlers/update-memory.ts` lines 26-71

---

### 2. ⚠️ Full Text Updates (CRITICAL - FIXED)

**Behavior**: Attempting to update text on a direct-access memory
**Status**: ⚠️ **WAS VULNERABLE** → ✅ **NOW PROTECTED**

**Original Problem**:
```javascript
// This WOULD have converted direct-access to searchable!
await update_memory({
  memory_id: "abc123",  // direct-access memory
  text: "New content",
  context_tags: ["updated"]
});
```

**What WOULD Have Happened** (before fix):
1. Delete old facts (none existed)
2. Extract NEW facts from text
3. Create embeddings
4. **Memory becomes searchable despite `direct_access_only = 1`**

**Fix Applied**:
- Added check at start of full text update flow
- Throws clear error if attempting to update text on direct-access memory
- Error message provides guidance:
  ```
  Cannot update text for direct-access-only memories.
  Direct-access memories cannot be converted to searchable memories.
  To change the content: (1) delete this memory, (2) create a new one.
  To update tags only: use add_tags/remove_tags parameters without 'text'.
  ```

**Test Result**: ✅ Correctly blocks text updates on direct-access memories

**Code**: `src/handlers/update-memory.ts` lines 79-108

---

### 3. ✅ Embedding Mode Switching (PROTECTED)

**Behavior**: Switching embedding modes (e.g., OpenAI → Local → OpenAI)
**Status**: ✅ **PROTECTED**

**What Could Have Gone Wrong**:
- If direct-access memories somehow had facts, `switch_embedding_mode` would try to embed them
- This would make them searchable in the new mode

**Protection Added**:
- `getFactsMissingEmbeddings()` now excludes facts from direct-access memories
- `countFactsMissingEmbeddings()` now excludes facts from direct-access memories
- Query includes: `AND m.direct_access_only = 0`

**Result**: Even if direct-access memories somehow get facts (which they shouldn't), mode switching won't embed them

**Code**: `src/operations.ts` lines 610-645

---

### 4. ✅ Search Operations (PROTECTED)

**Behavior**: Semantic search should never return direct-access memories
**Status**: ✅ **PROTECTED**

**Query Filter**:
```sql
WHERE m.context_id = ? AND m.direct_access_only = 0
```

**Test Result**: ✅ Direct-access memories never appear in search results, even after tag updates

**Code**: `src/operations.ts` searchFacts() line 249

---

### 5. ✅ List Operations (PROTECTED)

**Behavior**: Default listing should never return direct-access memories
**Status**: ✅ **PROTECTED**

**Query Filter**:
```sql
WHERE context_id = ? AND direct_access_only = ?
```
- `direct_access_only = 0` for normal listings
- `direct_access_only = 1` when explicitly requested

**Test Result**: ✅ Complete separation between memory types

**Code**: `src/operations.ts` listMemories() lines 328-333

---

### 6. ✅ Delete Operations (SAFE)

**Behavior**: Deleting memories of either type
**Status**: ✅ **SAFE** - Works correctly

**What Happens**:
- CASCADE constraints automatically delete facts
- CASCADE constraints automatically delete embeddings
- Works identically for both memory types

**Code**: Database schema has proper CASCADE relationships

---

### 7. ✅ Get Memory (SAFE)

**Behavior**: Retrieving individual memory by ID
**Status**: ✅ **SAFE** - Works correctly for both types

**What Happens**:
- Returns complete memory regardless of type
- Includes `direct_access_only` field in response
- No side effects or modifications

---

## Other Considerations Analyzed

### Can you manually create facts for direct-access memories in the database?

**Technically Yes, But Doesn't Matter**:
- Database schema allows it (no constraint preventing it)
- However, our API never creates facts for direct-access memories
- Even if facts existed:
  - `search_memory()` excludes them (checks memory's `direct_access_only` flag)
  - `switch_embedding_mode` won't embed them (now checks `direct_access_only`)
  - `list_memories()` won't show the memory (checks `direct_access_only`)

**Defense in Depth**: Multiple layers of protection ensure data integrity

### What about context tags and filtering?

**Status**: ✅ **WORKS CORRECTLY**

- Direct-access memories support tags
- Tags work with `list_memories(direct_access_only: true, context_tags: [...])`
- Tags do NOT make direct-access memories visible in:
  - Normal listings
  - Searches
  - Tag metadata (`getAllTags()` excludes direct-access memories)

---

## Complete Protection Matrix

| Operation | Can Convert Direct→Searchable? | Protected? |
|-----------|-------------------------------|------------|
| Tag-only update (`add_tags`/`remove_tags`) | ❌ No | ✅ Yes (by design) |
| Full text update (`text` parameter) | ❌ No | ✅ Yes (blocked with error) |
| Search with any query | ❌ No | ✅ Yes (SQL filter) |
| List memories (default) | ❌ No | ✅ Yes (SQL filter) |
| List with tags filter | ❌ No | ✅ Yes (SQL filter) |
| Switch embedding mode | ❌ No | ✅ Yes (excluded from backfill) |
| Manual database modification | ⚠️ Theoretically | ✅ Yes (multiple protections) |

---

## Test Results

### Original Feature Tests
```
✅ Test 1: Normal memory creation
✅ Test 2: Direct-access memory creation
✅ Test 3: Search exclusion
✅ Test 4: List exclusion (default)
✅ Test 5: Direct-access listing with truncation
✅ Test 6: Full retrieval via get_memory
✅ Test 7: Tag filtering
```

### Edge Case Tests
```
✅ Test 1: Create direct-access memory
✅ Test 2: Block text update (correctly raises error)
✅ Test 3: Allow tag addition
✅ Test 4: Allow tag removal
✅ Test 5: Verify still not searchable
✅ Test 6: Verify normal memories still update correctly
```

---

## Recommendations for Users

### ✅ Safe Operations on Direct-Access Memories

1. **Get full content**:
   ```javascript
   const memory = await get_memory("memory_id");
   ```

2. **Add tags**:
   ```javascript
   await update_memory({
     memory_id: "memory_id",
     add_tags: ["new-tag"]
   });
   ```

3. **Remove tags**:
   ```javascript
   await update_memory({
     memory_id: "memory_id",
     remove_tags: ["old-tag"]
   });
   ```

4. **List and recover**:
   ```javascript
   const memories = await list_memories({
     direct_access_only: true,
     context_tags: ["config"]
   });
   ```

5. **Delete**:
   ```javascript
   await delete_memory("memory_id");
   ```

### ❌ Blocked Operations

1. **Update text** (correctly blocked):
   ```javascript
   // This will throw an error with helpful message
   await update_memory({
     memory_id: "memory_id",  // direct-access
     text: "new content"      // ❌ Not allowed
   });
   ```

### 🔄 How to Update Content

To update the content of a direct-access memory:

```javascript
// 1. Get the old memory
const old = await get_memory("memory_id");

// 2. Delete it
await delete_memory("memory_id");

// 3. Create new one with updated content
const newMem = await add_memory({
  text: updatedContent,
  context_tags: old.context_tags,  // preserve tags
  direct_access_only: true
});
```

---

## Implementation Files Changed

1. `src/handlers/update-memory.ts` - Added text update protection
2. `src/operations.ts` - Added embedding backfill protection
3. `tests/test-edge-cases.js` - Comprehensive edge case test suite

---

## Conclusion

✅ **Direct-access memories are fully protected from accidental conversion to searchable memories.**

The implementation includes:
- ✅ SQL-level filtering (primary protection)
- ✅ API-level validation (secondary protection)
- ✅ Clear error messages (user guidance)
- ✅ Comprehensive test coverage
- ✅ Defense in depth (multiple protection layers)

**No edge cases found that allow conversion from direct-access to searchable mode.**



