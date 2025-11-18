#!/usr/bin/env node

/**
 * MCP Local Memory Server (SQLite Edition)
 * 
 * A simple, focused MCP memory server with embedded SQLite vector search.
 * Memories → Facts model with LLM-driven fact extraction.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import handlers
import { handleAddMemory } from "./handlers/add-memory.js";
import { handleUpdateMemory } from "./handlers/update-memory.js";
import { handleSearchMemory } from "./handlers/search-memory.js";
import { handleListMemories } from "./handlers/list-memories.js";
import { handleGetContextTags } from "./handlers/get-tags.js";
import { handleGetMemory } from "./handlers/get-memory.js";
import { handleDeleteMemory } from "./handlers/delete-memory.js";
import { handleSwitchEmbeddingMode } from "./handlers/switch-embedding-mode.js";
import { handleGetToolCallNotes } from "./handlers/get-tool-call-notes.js";
import { handleRecordToolCallNote } from "./handlers/record-tool-call-note.js";
import { handleDeleteToolCallNote } from "./handlers/delete-tool-call-note.js";
import { getCurrentMode } from "./embeddings/factory.js";
import { LocalEmbedder } from "./embeddings/local-embedder.js";
import { getToolCallNoteStats } from "./operations.js";
import config from "./config.js";

// Initialize database (side effect: creates schema if needed)
import "./database.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if local embedding model is currently downloading
 * Returns a user-friendly progress message if download is in progress
 */
function checkDownloadProgress(): { isDownloading: boolean; message?: string } {
  const currentMode = getCurrentMode();
  
  // Only check for local modes
  if (!currentMode || !currentMode.startsWith('local')) {
    return { isDownloading: false };
  }
  
  const downloadStatus = LocalEmbedder.getDownloadStatus();
  
  if (!downloadStatus.isDownloading) {
    return { isDownloading: false };
  }
  
  const elapsed = downloadStatus.elapsedSeconds;
  const estimatedTotal = 180; // 3 minutes max
  const remaining = Math.max(0, estimatedTotal - elapsed);
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const remainingStr = minutes > 0 
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;
  
  const percentComplete = Math.min(95, Math.floor((elapsed / estimatedTotal) * 100));
  
  const message = 
    `⬇️ Local embedding model downloading: ${downloadStatus.modelName}\n\n` +
    `Progress: ~${percentComplete}%\n` +
    `Elapsed: ${elapsed}s\n` +
    `Estimated remaining: ${remainingStr}\n\n` +
    `This is a one-time download (~130MB). The model will be cached for future use.\n` +
    `Please wait for the download to complete, then retry this operation.\n\n` +
    `Tip: You can switch to OpenAI mode (if you have an API key) using the ` +
    `'switch_embedding_mode' tool for instant operation while the model downloads.`;
  
  return { isDownloading: true, message };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "mcp-local-memory",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool Definitions
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
      {
        name: "add_memory",
        description:
          "Store a new memory. Memories are broken into searchable 'facts' (atomic statements). Context tags organize memories by topic/project - check get_context_tags for existing tags. Provide facts manually for control, or omit to let AI extract them (extracted facts returned for review). Use direct_access_only for large reference data (JSON configs, API responses, logs) that shouldn't pollute search results.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Memory content. Keep concise (4-5 sentences), focused on a single topic. Can be larger for direct_access_only memories.",
            },
            context_tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for categorization (e.g., ['typescript', 'coding-standards', 'project-xyz']). Reuse existing tags when possible.",
            },
            facts: {
              type: "array",
              items: { type: "string" },
              description: "Optional: Manually specify facts. If omitted, AI extracts them automatically. Ignored if direct_access_only is true.",
            },
            direct_access_only: {
              type: "boolean",
              description: "If true, skips fact extraction and makes memory invisible to searches/listings. Only retrievable via get_memory(memory_id). Use for large reference data (JSON configs, API responses, logs) to avoid context pollution. Default: false.",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "update_memory",
        description:
          "Update existing memory. Two modes: (1) Full update - provide 'text' to replace memory content and regenerate facts. (2) Tag-only update - provide 'add_tags' or 'remove_tags' to modify tags without reprocessing facts (efficient, no LLM call). For full updates, provide facts manually or let AI extract them.",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: {
              type: "string",
              description: "ID of memory to update (from list_memories or search_memory)",
            },
            text: {
              type: "string",
              description: "Updated content. Replaces previous text entirely. Required for full update, omit for tag-only update.",
            },
            context_tags: {
              type: "array",
              items: { type: "string" },
              description: "Complete new tag set. Only used with 'text' for full update. Reuse existing tags when possible.",
            },
            facts: {
              type: "array",
              items: { type: "string" },
              description: "Optional: Manually specify facts for full update. If omitted, AI extracts automatically.",
            },
            add_tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to add to existing tags (tag-only update). Efficient - no fact reprocessing.",
            },
            remove_tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to remove from existing tags (tag-only update). Efficient - no fact reprocessing.",
            },
          },
          required: ["memory_id"],
        },
      },
      {
        name: "search_memory",
        description:
          "Semantic search through memories. Primary retrieval method - understands meaning, not just keywords. Tags provide soft boost (not filter) - all memories are searched, but tag matches rank higher. Case-insensitive partial matching. Use tags freely to guide relevance.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "What to find. Be specific. Examples: 'deployment configuration', 'TypeScript preferences', 'error handling'",
            },
            context_tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional tags to boost relevance (not filter). Memories with matching tags rank higher. Case-insensitive, partial match (e.g., 'js' matches 'javascript'). All memories still searchable.",
            },
            limit: {
              type: "number",
              description: "Max results. Default: 10.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_memories",
        description:
          "List memories chronologically (newest first). Good for browsing recent activity. Prefer search_memory for finding specific information - it's more precise. By default shows only normal searchable memories. Use direct_access_only=true to list/recover direct-access memories (text truncated to ~200 chars).",
        inputSchema: {
          type: "object",
          properties: {
            context_tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags to show only memories about specific topics/projects.",
            },
            limit: {
              type: "number",
              description: "Max memories. Default: 50. Keep low - search is more efficient for specific needs.",
            },
            direct_access_only: {
              type: "boolean",
              description: "If true, lists ONLY direct-access memories (text truncated to ~200 chars). If false/omitted, lists ONLY normal searchable memories. Use true to recover lost memory IDs. Default: false.",
            },
          },
        },
      },
      {
        name: "get_context_tags",
        description: "Discover available topics/projects with metadata. Returns each tag with: memory count, first memory date (earliest), last memory date (most recent). Call this first if unsure which tags to use. Tags narrow vague queries and improve results.",
        inputSchema: {
          type: "object",
          properties: {
            regex: {
              type: "string",
              description: "Use when checking existense of specific tag(s). Use regex to check for partial matches. Examples: '(?i)deploy' (case-insensitive 'deploy'), '(?i)(js|javascript)' (JS-related), '^test' (starts with 'test'). This helps narrow down a large tag list.",
            },
          },
        },
      },
      {
        name: "get_memory",
        description: "Retrieve a specific memory by its ID. Useful for referencing exact memories (e.g., pinned SOPs, user-mentioned IDs, or memories from previous search results). Returns the complete memory with all its facts.",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: {
              type: "string",
              description: "Memory ID (from search_memory, list_memories, or user-provided)",
            },
          },
          required: ["memory_id"],
        },
      },
      {
        name: "delete_memory",
        description: "Permanently delete a memory and all its facts. Cannot be recovered.",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: {
              type: "string",
              description: "ID of memory to delete (from list_memories or search_memory)",
            },
          },
          required: ["memory_id"],
        },
      },
      {
        name: "switch_embedding_mode",
        description: 
          "Switch between embedding modes. ONLY use if: (1) user explicitly requests it, OR (2) OpenAI API fails (quota/auth error). " +
          "Available modes: 'openai' (requires API key, auto fact extraction), 'local_english' (~120MB download, manual facts only), " +
          "'local_multilingual' (~130MB download, manual facts only, default for local). " +
          "\n\n**Smart switching:** Only creates embeddings for facts that don't have them in the target mode. " +
          "If switching back to a previously used mode (e.g., OpenAI → Local → OpenAI), existing embeddings are reused. " +
          "Response includes count of missing embeddings and estimated time (typically < 1 minute for a few hundred facts). " +
          "\n\nFirst use of local modes downloads model (1-3 min). All existing memories remain accessible.",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["openai", "local_english", "local_multilingual"],
              description: "Target mode: 'openai' (API-based), 'local_english' (offline, English only), 'local_multilingual' (offline, supports 50+ languages)",
            },
          },
          required: ["mode"],
        },
      },
    ];

  // Conditionally add tool call notes tools
  if (config.enableToolCallNotes) {
    // Build dynamic description with available tool notes
    let getNotesDescription = "🔍 ESSENTIAL: Query before making ANY tool call you're uncertain about! This prevents repeating failures and saves time by leveraging previous learnings.";
    
    try {
      const noteStats = getToolCallNoteStats(config.contextId);
      if (noteStats.length > 0) {
        getNotesDescription += "\n\n📊 **Notes available for:**";
        noteStats.forEach(stat => {
          getNotesDescription += `\n  • ${stat.toolName} (${stat.count} ${stat.count === 1 ? 'note' : 'notes'})`;
        });
        getNotesDescription += "\n\nCheck these before calling! This builds your expertise over time.";
      } else {
        getNotesDescription += "\n\nUse when: unsure about parameters, tool previously failed, or want to check best practices. This builds your expertise over time!";
      }
    } catch (error) {
      // Fallback to basic description if query fails
      getNotesDescription += "\n\nUse when: unsure about parameters, tool previously failed, or want to check best practices. This builds your expertise over time!";
    }
    
    tools.push(
      {
        name: "get_tool_call_notes",
        description: getNotesDescription,
        inputSchema: {
          type: "object",
          properties: {
            tool_name: {
              type: "string",
              description: "Tool name to query notes for (e.g., 'jira-sse-add_comment', 'github-create-issue')",
            },
            note_type: {
              type: "string",
              enum: ["success", "failure", "pattern", "guideline", "all"],
              description: "Filter by note type. Use 'failure' to avoid mistakes, 'success' for working patterns, 'all' for complete picture. Default: 'all'",
            },
            limit: {
              type: "number",
              description: "Max results. Default: 10.",
            },
          },
          required: ["tool_name"],
        },
      } as any,
      {
        name: "record_tool_call_note",
        description:
          "📝 CRITICAL: Record tool-specific learnings after failures/successes or user feedback about HOW to use a specific tool. For general knowledge, use add_memory instead.\n\n" +
          "**Record here (tool-specific):**\n" +
          "• 'jira-create-issue: Use project=\"GSO\", issuetype=\"Task\", assignee field is \"assignee.emailAddress\"'\n" +
          "• 'run-command: Git commands need --no-pager flag for clean output'\n" +
          "• 'web-search: Always include year in query (e.g., \"typescript best practices 2024\")'\n" +
          "• 'add-comment: User prefers concise technical style, no pleasantries, use bullet points'\n\n" +
          "**Use add_memory for:** General preferences, project details, or knowledge not tied to specific tool usage.\n\n" +
          "Types: 'failure' (errors), 'success' (working patterns), 'pattern' (recurring behaviors), 'guideline' (user feedback on style/format).",
        inputSchema: {
          type: "object",
          properties: {
            tool_name: {
              type: "string",
              description: "Tool name (e.g., 'jira-sse-add_comment', 'github-create-issue')",
            },
            note_type: {
              type: "string",
              enum: ["success", "failure", "pattern", "guideline"],
              description: "Type: 'failure' for errors/what went wrong, 'success' for working patterns, 'pattern' for recurring behaviors, 'guideline' for best practices",
            },
            content: {
              type: "string",
              description: "Clear, specific note about what you learned (e.g., 'Use comment parameter, not content', 'Requires authentication header')",
            },
            parameters: {
              type: "array",
              items: { type: "string" },
              description: "Parameter names involved (e.g., ['comment', 'issueKey'], ['authorization', 'content'])",
            },
            error_message: {
              type: "string",
              description: "For failures: exact error message received",
            },
            success_pattern: {
              type: "string",
              description: "For successes: what combination worked (e.g., 'comment + issueKey + auth header')",
            },
          },
          required: ["tool_name", "note_type", "content"],
        },
      } as any,
      {
        name: "delete_tool_call_note",
        description:
          "🗑️ Clean up outdated or incorrect tool notes to maintain accurate knowledge base. Use when: information becomes obsolete, tool API changes, or you want to replace notes with better ones (delete old, add new). Prevents knowledge pollution!",
        inputSchema: {
          type: "object",
          properties: {
            note_id: {
              type: "string",
              description: "ID of note to delete (from get_tool_call_notes response)",
            },
          },
          required: ["note_id"],
        },
      } as any
    );
  }

  return { tools };
});

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("Arguments are required");
  }

  // Check if local embedding model is downloading (only for operations that need embeddings)
  const operationsThatNeedEmbeddings = ['add_memory', 'update_memory', 'search_memory'];
  if (operationsThatNeedEmbeddings.includes(name)) {
    const downloadCheck = checkDownloadProgress();
    if (downloadCheck.isDownloading) {
      return {
        content: [
          {
            type: "text",
            text: downloadCheck.message!,
          },
        ],
      };
    }
  }

  try {
    switch (name) {
      case "add_memory":
        return await handleAddMemory(args);

      case "update_memory":
        return await handleUpdateMemory(args);

      case "search_memory":
        return await handleSearchMemory(args);

      case "list_memories":
        return await handleListMemories(args);

      case "get_context_tags":
        return await handleGetContextTags(args);

      case "get_memory":
        return await handleGetMemory(args);

      case "delete_memory":
        return await handleDeleteMemory(args);

      case "switch_embedding_mode":
        return await handleSwitchEmbeddingMode(args);

      case "get_tool_call_notes":
        if (!config.enableToolCallNotes) {
          throw new Error("Tool call notes are disabled");
        }
        return await handleGetToolCallNotes(args);

      case "record_tool_call_note":
        if (!config.enableToolCallNotes) {
          throw new Error("Tool call notes are disabled");
        }
        return await handleRecordToolCallNote(args);

      case "delete_tool_call_note":
        if (!config.enableToolCallNotes) {
          throw new Error("Tool call notes are disabled");
        }
        return await handleDeleteToolCallNote(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message,
              stack: error.stack,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  const mode = getCurrentMode();
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("MCP Local Memory Server running on stdio");
  console.error(`Embedding mode: ${mode || 'initializing'}`);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
