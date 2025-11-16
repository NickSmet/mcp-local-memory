/**
 * Handler: delete_memory
 * 
 * Delete a specific memory by ID
 */

import config from "../config.js";
import { deleteMemory } from "../operations.js";

export async function handleDeleteMemory(args: any) {
  const { memory_id } = args;

  if (!memory_id) {
    throw new Error("memory_id is required");
  }

  const deleted = deleteMemory(memory_id, config.contextId);

  if (!deleted) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              message: `Memory not found or does not belong to user`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            memory_id,
            message: `Memory deleted successfully`,
          },
          null,
          2
        ),
      },
    ],
  };
}

