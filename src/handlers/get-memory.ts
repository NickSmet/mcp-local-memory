/**
 * Handler: get_memory
 * 
 * Retrieve a specific memory by its ID
 */

import { getMemory, getFactsByMemoryId } from "../operations.js";

export async function handleGetMemory(args: any) {
  const { memory_id } = args;

  if (!memory_id) {
    throw new Error("memory_id parameter is required");
  }

  const memory = getMemory(memory_id);

  if (!memory) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: `Memory with ID '${memory_id}' not found`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const facts = getFactsByMemoryId(memory_id);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            memory: {
              id: memory.id,
              context_id: memory.contextId,
              text: memory.text,
              context_tags: memory.tags,
              created_at: new Date(memory.createdAt).toISOString(),
              updated_at: new Date(memory.updatedAt).toISOString(),
              version: memory.version,
            },
            facts: facts.map((f) => ({
              id: f.id,
              text: f.text,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

