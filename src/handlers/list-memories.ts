/**
 * Handler: list_memories
 * 
 * List all memories with optional tag filtering
 * Supports direct_access_only parameter for filtering memory types
 */

import config from "../config.js";
import { listMemories } from "../operations.js";
import { formatMemory } from "../format.js";

const TRUNCATE_LENGTH = 200;

/**
 * Truncate text to approximately 200 characters at word boundary
 */
function truncateText(text: string): string {
  if (text.length <= TRUNCATE_LENGTH) {
    return text;
  }
  
  // Find the last space before or at the truncate length
  const truncated = text.substring(0, TRUNCATE_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

export async function handleListMemories(args: any) {
  const contextTags = (args.context_tags as string[]) || undefined;
  const limit = (args.limit as number) || 50;
  const directAccessOnly = args.direct_access_only === true;

  const memories = listMemories(config.contextId, contextTags, limit, directAccessOnly);

  // Truncate text for ALL memories to keep responses manageable
  const formattedMemories = memories.map((memory) => {
    const formatted = formatMemory(memory);
    
    // Always truncate text in list view
    formatted.text = truncateText(formatted.text);
    
    return formatted;
  });

  const response: any = {
    count: memories.length,
    memories: formattedMemories,
    note: "Text truncated to ~200 characters. Use get_memory(memory_id) to retrieve full content.",
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

