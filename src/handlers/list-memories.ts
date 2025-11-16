/**
 * Handler: list_memories
 * 
 * List all memories with optional tag filtering
 */

import config from "../config.js";
import { listMemories } from "../operations.js";
import { formatMemory } from "../format.js";

export async function handleListMemories(args: any) {
  const contextTags = (args.context_tags as string[]) || undefined;
  const limit = (args.limit as number) || 50;

  const memories = listMemories(config.contextId, contextTags, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: memories.length,
            memories: memories.map(formatMemory),
          },
          null,
          2
        ),
      },
    ],
  };
}

