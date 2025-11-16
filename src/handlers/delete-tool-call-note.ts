/**
 * Handler: delete_tool_call_note
 * 
 * Remove outdated or incorrect tool call notes to keep
 * the knowledge base clean and prevent misinformation.
 */

import config from "../config.js";
import { deleteToolCallNote } from "../operations.js";

export async function handleDeleteToolCallNote(args: any) {
  const { note_id } = args;
  
  if (!note_id) {
    throw new Error("note_id is required");
  }
  
  const deleted = deleteToolCallNote(config.contextId, note_id);
  
  if (!deleted) {
    throw new Error("Note not found or access denied");
  }
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            note_id,
            message: "Tool call note deleted - knowledge base updated",
          },
          null,
          2
        ),
      },
    ],
  };
}
