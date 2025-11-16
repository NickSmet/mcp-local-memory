/**
 * Response Formatting Utilities
 * 
 * Convert Unix timestamps to ISO 8601 strings for LLM readability
 */

import type { Memory, Fact } from "./types.js";

/**
 * Convert Unix timestamp to ISO 8601 string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Format memory for response (convert timestamps to ISO strings)
 */
export function formatMemory(memory: Memory): any {
  return {
    id: memory.id,
    context_id: memory.contextId,
    text: memory.text,
    context_tags: memory.tags,
    created_at: formatTimestamp(memory.createdAt),
    updated_at: formatTimestamp(memory.updatedAt),
    version: memory.version,
  };
}

/**
 * Format fact for response (convert timestamps to ISO strings)
 */
export function formatFact(fact: Fact): any {
  return {
    id: fact.id,
    memory_id: fact.memoryId,
    text: fact.text,
    created_at: formatTimestamp(fact.createdAt),
    updated_at: formatTimestamp(fact.updatedAt),
    version: fact.version,
  };
}

