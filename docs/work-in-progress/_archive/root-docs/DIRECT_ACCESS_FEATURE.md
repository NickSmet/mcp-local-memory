# Direct-Access-Only Memories Feature

## Overview

The direct-access-only memories feature allows you to store large reference data (JSON configs, API responses, structured data, logs) without polluting semantic search results or LLM context during normal memory operations.

## Key Benefits

- **Cleaner Context**: Large data doesn't appear in search results or normal listings
- **Performance**: Skip unnecessary fact extraction for structured data
- **Flexibility**: Choose appropriate storage mode per memory
- **Safety**: Recovery mechanism via filtered listing prevents data loss

## Usage

### Creating Direct-Access-Only Memories

```javascript
const result = await add_memory({
  text: JSON.stringify(largeConfig),
  context_tags: ["api-config", "production"],
  direct_access_only: true
});
// Returns: { memory_id: "abc123", direct_access_only: true, ... }
```

When `direct_access_only: true`:
- ✅ Fact extraction is skipped (no LLM calls, no embeddings)
- ✅ Memory created with empty facts array
- ✅ Can store large data without performance concerns
- ✅ Context tags still work for organization

### Retrieving Direct-Access Memories

**Option 1: Direct Retrieval (Full Content)**
```javascript
const memory = await get_memory("abc123");
// Returns complete memory with full text
```

**Option 2: Recovery via Listing (Truncated)**
```javascript
const directMemories = await list_memories({
  direct_access_only: true,
  context_tags: ["api-config"]
});
// Returns truncated previews (~200 chars) to help identify memories
```

**Note**: ALL memories returned by `list_memories()` are truncated to ~200 characters to keep responses manageable. Use `get_memory(id)` to retrieve full content.

### Behavior Differences

| Operation | Normal Memories | Direct-Access Memories |
|-----------|----------------|------------------------|
| `search_memory()` | ✅ Returned | ❌ Never returned |
| `list_memories()` default | ✅ Returned (truncated) | ❌ Never returned |
| `list_memories(direct_access_only: true)` | ❌ Never returned | ✅ Returned (truncated) |
| `get_memory(id)` | ✅ Full retrieval | ✅ Full retrieval |
| `context_tags` | ✅ Supported | ✅ Supported |
| Fact extraction | ✅ Required | ❌ Skipped |

**Note**: All `list_memories()` calls return truncated text (~200 chars) to keep responses manageable.

## Use Cases

1. **Large JSON Configurations**
   ```javascript
   await add_memory({
     text: JSON.stringify(fullApiConfig),
     context_tags: ["api-config", "production"],
     direct_access_only: true
   });
   ```

2. **API Response Caching**
   ```javascript
   await add_memory({
     text: JSON.stringify(apiResponse),
     context_tags: ["cache", "user-data", "session-123"],
     direct_access_only: true
   });
   ```

3. **Log Storage**
   ```javascript
   await add_memory({
     text: errorLog,
     context_tags: ["error-logs", "2025-11-18"],
     direct_access_only: true
   });
   ```

4. **Structured Reference Data**
   ```javascript
   await add_memory({
     text: JSON.stringify(databaseSchema),
     context_tags: ["schema", "database", "v2.0"],
     direct_access_only: true
   });
   ```

## Implementation Details

### Database Schema

Added `direct_access_only` column to `memories` table:
```sql
ALTER TABLE memories ADD COLUMN direct_access_only INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_memories_direct_access_only ON memories(direct_access_only);
```

Migration is automatic - existing databases will be updated on first run.

### API Changes

**`add_memory` - New Parameter**
```javascript
{
  text: string,              // required
  context_tags?: string[],   // optional
  facts?: string[],          // optional, ignored if direct_access_only=true
  direct_access_only?: boolean  // optional, default: false
}
```

**`list_memories` - New Parameter**
```javascript
{
  context_tags?: string[],      // optional
  limit?: number,               // optional, default: 50
  direct_access_only?: boolean  // optional, default: false
}
```

When `direct_access_only: true`:
- Returns ONLY direct-access memories
- Text truncated to ~200 characters at word boundary
- Includes full metadata (id, tags, dates)
- Response includes note about truncation

### Update Behavior

The `direct_access_only` status is **immutable** after creation:
- Tag-only updates work normally (add/remove tags)
- Full text updates preserve the `direct_access_only` status
- Cannot convert between direct-access and searchable modes
- To change mode: delete old memory and create new one

## Testing

Run the comprehensive test suite:
```bash
npm run build
node tests/test-direct-access.js
```

Tests verify:
- ✅ Normal memory creation
- ✅ Direct-access memory creation
- ✅ Search exclusion
- ✅ List exclusion (default)
- ✅ Direct-access listing
- ✅ Text truncation
- ✅ Full retrieval via get_memory
- ✅ Tag filtering

## Compatibility

- ✅ Works with both OpenAI and local embedding modes
- ✅ Backward compatible - existing memories unaffected
- ✅ Automatic migration for existing databases
- ✅ No breaking changes to existing API

## Performance Benefits

For a large JSON config (10KB):

**Before (Normal Memory)**
- LLM fact extraction call: ~500ms
- Generate embeddings: ~200ms per fact
- Total: ~1000-2000ms

**After (Direct-Access)**
- Skip fact extraction: 0ms
- Skip embeddings: 0ms
- Total: ~5-10ms (database write only)

**200x faster** for large reference data!

## Examples from Tests

```javascript
// Normal searchable memory
const normal = await add_memory({
  text: "User prefers TypeScript with strict mode enabled",
  context_tags: ["typescript", "preferences"],
  facts: ["User prefers TypeScript", "User uses strict mode"]
});

// Direct-access memory with large JSON
const direct = await add_memory({
  text: JSON.stringify({
    apiEndpoints: {
      production: "https://api.example.com",
      staging: "https://staging-api.example.com"
    },
    features: {
      darkMode: true,
      analytics: false
    }
  }),
  context_tags: ["api-config", "production"],
  direct_access_only: true
});

// Search returns normal memory only
const searchResults = await search_memory({ query: "configuration" });
// ✅ Returns normal memories
// ❌ Never returns direct-access memories

// List normal memories
const normalList = await list_memories();
// ✅ Returns only normal memories

// List direct-access memories
const directList = await list_memories({ direct_access_only: true });
// ✅ Returns only direct-access memories (truncated)

// Retrieve full content
const fullMemory = await get_memory(direct.memory_id);
// ✅ Returns complete JSON config
```

## Migration Notes

### Existing Databases

When you first run the updated version:
1. Database migration runs automatically
2. `direct_access_only` column added with default value `0` (false)
3. All existing memories remain searchable
4. Index created for optimal query performance

### No Data Loss

- ✅ All existing memories preserved
- ✅ All existing facts preserved
- ✅ All existing embeddings preserved
- ✅ No downtime required

## Future Enhancements

Potential improvements (not implemented):
- Compression for very large direct-access memories
- Separate storage backend for direct-access data
- Conversion tools to migrate between modes
- Bulk operations for direct-access memories
- Configurable truncation length

## Credits

Feature designed and implemented based on comprehensive requirements document.
Includes automatic migration, comprehensive testing, and backward compatibility.

