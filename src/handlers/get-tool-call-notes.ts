/**
 * Handler: get_tool_call_notes
 * 
 * Query existing notes about tool usage to avoid repeating mistakes
 * and leverage previous learnings for better tool call success rates.
 */

import config from "../config.js";
import { getToolCallNotes } from "../operations.js";

export async function handleGetToolCallNotes(args: any) {
  const { tool_name, note_type, limit } = args;
  
  if (!tool_name) {
    throw new Error("tool_name is required");
  }
  
  const notes = getToolCallNotes(
    config.contextId,
    tool_name,
    note_type,
    limit || 10
  );
  
  const response = {
    tool_name,
    count: notes.length,
    notes: notes.map((note) => ({
      id: note.id,
      note_type: note.noteType,
      content: note.content,
      ...(note.parameters && { parameters: note.parameters }),
      ...(note.errorMessage && { error_message: note.errorMessage }),
      ...(note.successPattern && { success_pattern: note.successPattern }),
      created_at: new Date(note.createdAt).toISOString(),
    })),
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
