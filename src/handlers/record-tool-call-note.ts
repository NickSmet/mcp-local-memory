/**
 * Handler: record_tool_call_note
 * 
 * Store learnings from tool call attempts to build up expertise
 * and avoid repeating the same mistakes in the future.
 */

import config from "../config.js";
import { addToolCallNote } from "../operations.js";

export async function handleRecordToolCallNote(args: any) {
  const { tool_name, note_type, content, parameters, error_message, success_pattern } = args;
  
  if (!tool_name || !note_type || !content) {
    throw new Error("tool_name, note_type, and content are required");
  }
  
  if (!["success", "failure", "pattern", "guideline"].includes(note_type)) {
    throw new Error("note_type must be: success, failure, pattern, or guideline");
  }
  
  const id = addToolCallNote(
    config.contextId,
    tool_name,
    note_type,
    content,
    parameters,
    error_message,
    success_pattern
  );
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            id,
            tool_name,
            note_type,
            message: "Tool call note recorded - building expertise for future use",
          },
          null,
          2
        ),
      },
    ],
  };
}
