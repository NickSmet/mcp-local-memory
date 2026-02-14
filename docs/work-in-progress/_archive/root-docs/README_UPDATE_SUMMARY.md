# README Update Summary - Direct-Access Memories

## Changes Made to README.md

### 1. Added to "What Can It Do?" Section (Line ~94)

New example showing direct-access memory usage:
```markdown
**Store large reference data (NEW):**
```
You: "Store this API configuration as a direct-access memory"
AI: ✓ Saved as direct-access (won't appear in searches, retrieve by ID)
```
Direct-access memories are perfect for:
- Large JSON configs
- API responses for reference
- Log files
- Any structured data you want available but not searchable
```

### 2. Added New Section: "Direct-Access Memories" (Line ~234)

Complete subsection in Advanced Configuration explaining:
- How to use direct-access memories
- Benefits (200x faster, no context pollution)
- Use cases
- Link to full documentation

### 3. Documentation References

Added link to `DIRECT_ACCESS_FEATURE.md` for complete feature documentation.

---

## Manual Database Migration Instructions

### For Memory `R7nHZoew`

**Option 1: Quick Shell Script**

```bash
# Make executable
chmod +x convert-memory.sh

# Run (will auto-find database or use SQLITE_PATH env var)
./convert-memory.sh
```

**Option 2: Manual SQL**

```bash
# Find your database
ls -la ~/Documents/mcp-personal-memory/memory.db
# or
ls -la ~/.openmemory/memory.db

# Run the SQL script
sqlite3 /path/to/your/memory.db < MANUAL_MIGRATION_R7nHZoew.sql
```

**Option 3: Direct Commands**

```bash
# Replace /path/to/memory.db with your actual path
sqlite3 /path/to/memory.db <<EOF
-- Add column if needed
ALTER TABLE memories ADD COLUMN direct_access_only INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_memories_direct_access_only ON memories(direct_access_only);

-- Convert memory R7nHZoew
UPDATE memories SET direct_access_only = 1 WHERE id = 'R7nHZoew';
DELETE FROM facts WHERE memory_id = 'R7nHZoew';

-- Verify
SELECT id, direct_access_only, (SELECT COUNT(*) FROM facts WHERE memory_id = 'R7nHZoew') as facts FROM memories WHERE id = 'R7nHZoew';
EOF
```

---

## What This Does

1. **Adds `direct_access_only` column** to database (safe migration)
2. **Sets `R7nHZoew` to direct-access** (`direct_access_only = 1`)
3. **Deletes all facts** for this memory (CASCADE removes embeddings)
4. **Verifies** the conversion

After this:
- ✅ Memory `R7nHZoew` won't appear in searches
- ✅ Won't appear in normal `list_memories()`
- ✅ Can retrieve via `get_memory('R7nHZoew')`
- ✅ Appears in `list_memories(direct_access_only: true)`
- ✅ Tags still work for organization

---

## Adding a Memory About This Feature

Once you've verified the feature works, add a memory like:

```javascript
await add_memory({
  text: `Direct-access-only memories feature implemented (2024-11):
  
  - New parameter: direct_access_only (boolean)
  - Skips fact extraction (200x faster for large data)
  - Memories invisible to search/list by default
  - Retrievable via get_memory(id) or list_memories(direct_access_only: true)
  - Perfect for: JSON configs, API responses, logs, structured reference data
  - Documentation: DIRECT_ACCESS_FEATURE.md, EDGE_CASES_ANALYSIS.md
  - Edge cases protected: Cannot convert direct-access to searchable
  - Tests: tests/test-direct-access.js, tests/test-edge-cases.js
  
  Use cases: Store large reference data without polluting semantic search results.`,
  
  context_tags: ["openmemory", "features", "documentation", "memory-system"]
});
```

---

## Checking All Current Memories

To review all memories in your database:

```bash
sqlite3 /path/to/memory.db <<EOF
.mode column
.headers on

-- Count by type
SELECT 
  CASE WHEN direct_access_only = 1 THEN 'Direct-Access' ELSE 'Searchable' END as type,
  COUNT(*) as count
FROM memories
GROUP BY direct_access_only;

-- Show recent memories
SELECT 
  id,
  substr(text, 1, 80) as preview,
  tags,
  CASE WHEN direct_access_only = 1 THEN 'DA' ELSE 'S' END as type,
  datetime(created_at/1000, 'unixepoch') as created
FROM memories 
ORDER BY created_at DESC 
LIMIT 20;
EOF
```

---

## Files Created

1. ✅ `convert-memory.sh` - Quick conversion script
2. ✅ `MANUAL_MIGRATION_R7nHZoew.sql` - SQL migration script  
3. ✅ `README_UPDATE_SUMMARY.md` - This file
4. ✅ `README.md` - Updated with feature documentation

## Next Steps

1. **Run conversion script** for memory `R7nHZoew`
2. **Rebuild if needed**: `npm run build`
3. **Test the feature**: Create a direct-access memory and verify it works
4. **Add memory about feature**: Document this feature in the memory system itself
5. **Check existing memories**: Review what's in your database

---

**Note**: The migration is safe and backward-compatible. Existing memories are unaffected and default to searchable mode.



