/**
 * Database Operations
 * 
 * CRUD operations for memories, facts, and search
 */

import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { db } from "./database.js";
import { Memory, Fact, FactWithScore } from "./types.js";
import { vectorToBlob, blobToVector, dotProduct } from "./vector.js";
import { EMBEDDING_CONFIGS } from "./embeddings/types.js";
import type { EmbeddingType } from "./embeddings/types.js";

/**
 * Generate a short, URL-safe ID (8 characters)
 */
function generateShortId(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * Create a new memory
 */
export function createMemory(contextId: string, text: string, tags: string[]): Memory {
  const now = Date.now();
  const memory: Memory = {
    id: generateShortId(),
    contextId,
    text,
    tags,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const stmt = db.prepare(`
    INSERT INTO memories (id, context_id, text, tags, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    memory.id,
    memory.contextId,
    memory.text,
    JSON.stringify(memory.tags),
    memory.createdAt,
    memory.updatedAt,
    memory.version
  );

  return memory;
}

/**
 * Create a new fact with embedding
 */
export function createFact(
  memoryId: string,
  text: string,
  embedding: number[],
  embeddingType: EmbeddingType
): Fact {
  const now = Date.now();
  const fact: Fact = {
    id: generateShortId(),
    memoryId,
    text,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const vectorTable = EMBEDDING_CONFIGS[embeddingType].tableName;

  const insertFact = db.prepare(`
    INSERT INTO facts (id, memory_id, text, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertVector = db.prepare(`
    INSERT INTO ${vectorTable} (fact_id, dim, unit_norm, embedding)
    VALUES (?, ?, 1, ?)
  `);

  insertFact.run(
    fact.id,
    fact.memoryId,
    fact.text,
    fact.createdAt,
    fact.updatedAt,
    fact.version
  );

  insertVector.run(fact.id, embedding.length, vectorToBlob(embedding));

  return fact;
}

/**
 * Get a memory by ID
 */
export function getMemory(memoryId: string): Memory | null {
  const stmt = db.prepare(`
    SELECT id, context_id, text, tags, created_at, updated_at, version
    FROM memories WHERE id = ?
  `);

  const row = stmt.get(memoryId) as any;
  if (!row) return null;

  return {
    id: row.id,
    contextId: row.context_id,
    text: row.text,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

/**
 * Get all facts for a memory
 */
export function getFactsByMemoryId(memoryId: string): Fact[] {
  const stmt = db.prepare(`
    SELECT id, memory_id, text, created_at, updated_at, version
    FROM facts WHERE memory_id = ?
  `);

  const rows = stmt.all(memoryId) as any[];
  return rows.map((row) => ({
    id: row.id,
    memoryId: row.memory_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  }));
}

export interface TagMetadata {
  tag: string;
  memory_count: number;
  first_memory_date: number;
  last_memory_date: number;
}

/**
 * Get all unique tags for a user with metadata, with optional regex filter
 */
export function getAllTags(contextId: string, regexPattern?: string): TagMetadata[] {
  const stmt = db.prepare(`
    SELECT tags, created_at, updated_at FROM memories WHERE context_id = ?
  `);

  const rows = stmt.all(contextId) as any[];
  const tagMap = new Map<string, { count: number; firstDate: number; lastDate: number }>();

  rows.forEach((row) => {
    const tags = JSON.parse(row.tags) as string[];
    const createdAt = row.created_at;
    const updatedAt = row.updated_at;

    tags.forEach((tag) => {
      const existing = tagMap.get(tag);
      if (existing) {
        existing.count++;
        existing.firstDate = Math.min(existing.firstDate, createdAt);
        existing.lastDate = Math.max(existing.lastDate, updatedAt);
      } else {
        tagMap.set(tag, {
          count: 1,
          firstDate: createdAt,
          lastDate: updatedAt,
        });
      }
    });
  });

  let allTags = Array.from(tagMap.entries())
    .map(([tag, data]) => {
      return {
        tag,
        memory_count: data.count,
        first_memory_date: data.firstDate,
        last_memory_date: data.lastDate,
      };
    })
    .sort((a, b) => a.tag.localeCompare(b.tag));

  // Apply regex filter if provided
  if (regexPattern) {
    try {
      // Extract flags from pattern like (?i) or (?im)
      let flags = "";
      let pattern = regexPattern;
      
      // Check for inline flags at start: (?flags)
      const flagMatch = pattern.match(/^\(\?([imgsuy]+)\)/);
      if (flagMatch) {
        flags = flagMatch[1];
        pattern = pattern.slice(flagMatch[0].length);
      }
      
      const regex = new RegExp(pattern, flags);
      allTags = allTags.filter((item) => regex.test(item.tag));
    } catch (error: any) {
      throw new Error(`Invalid regex pattern: ${error.message}`);
    }
  }

  return allTags;
}

/**
 * Search facts by vector similarity with optional tag boosting (soft, not filter)
 */
export function searchFacts(
  contextId: string,
  queryVector: number[],
  embeddingType: EmbeddingType,
  topK: number = 20,
  boostTags?: string[],
  lambda: number = 0.1
): FactWithScore[] {
  const vectorTable = EMBEDDING_CONFIGS[embeddingType].tableName;
  
  // Get all facts (no hard tag filtering)
  const sql = `
    SELECT 
      f.id, f.memory_id, f.text, f.created_at, f.updated_at, f.version,
      fv.embedding,
      m.id as m_id, m.context_id, m.text as m_text, m.tags, m.created_at as m_created_at, 
      m.updated_at as m_updated_at, m.version as m_version
    FROM facts f
    JOIN ${vectorTable} fv ON f.id = fv.fact_id
    JOIN memories m ON f.memory_id = m.id
    WHERE m.context_id = ?
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all(contextId) as any[];

  // Normalize boost tags for case-insensitive partial matching
  const normalizedBoostTags = boostTags?.map((tag: string) => tag.toLowerCase()) || [];

  // Score each fact
  const scored: FactWithScore[] = rows.map((row) => {
    const embedding = blobToVector(row.embedding);
    const vectorScore = dotProduct(queryVector, embedding);

    let tagBoost = 0;
    if (normalizedBoostTags.length > 0) {
      const memoryTags = JSON.parse(row.tags) as string[];
      const normalizedMemoryTags = memoryTags.map((tag: string) => tag.toLowerCase());
      
      // Count matches (case-insensitive partial match)
      let matches = 0;
      for (const boostTag of normalizedBoostTags) {
        for (const memoryTag of normalizedMemoryTags) {
          // Check if either tag contains the other (partial match)
          if (memoryTag.includes(boostTag) || boostTag.includes(memoryTag)) {
            matches++;
            break; // Count each boost tag at most once
          }
        }
      }
      
      tagBoost = lambda * matches;
    }

    const totalScore = vectorScore + tagBoost;

    return {
      id: row.id,
      memoryId: row.memory_id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      score: totalScore,
      memory: {
        id: row.m_id,
        contextId: row.context_id,
        text: row.m_text,
        tags: JSON.parse(row.tags),
        createdAt: row.m_created_at,
        updatedAt: row.m_updated_at,
        version: row.m_version,
      },
    };
  });

  // Sort by score descending and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * List all memories for a user with optional case-insensitive tag filtering
 */
export function listMemories(
  contextId: string,
  filterTags?: string[],
  limit: number = 50
): Memory[] {
  // Get all memories for context, ordered by creation date
  const sql = `
    SELECT id, context_id, text, tags, created_at, updated_at, version
    FROM memories
    WHERE context_id = ?
    ORDER BY created_at DESC
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all(contextId) as any[];

  // Parse and filter in JavaScript for case-insensitive matching
  let memories = rows.map((row) => ({
    id: row.id,
    contextId: row.context_id,
    text: row.text,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  }));

  // Apply case-insensitive tag filtering if provided
  if (filterTags && filterTags.length > 0) {
    const normalizedFilterTags = filterTags.map((tag: string) => tag.toLowerCase());
    
    memories = memories.filter((memory) => {
      const normalizedMemoryTags = memory.tags.map((tag: string) => tag.toLowerCase());
      // Check if any filter tag matches (case-insensitive)
      return normalizedFilterTags.some((filterTag: string) => 
        normalizedMemoryTags.includes(filterTag)
      );
    });
  }

  return memories.slice(0, limit);
}

/**
 * Update an existing memory
 */
export function updateMemory(
  memoryId: string,
  contextId: string,
  text: string,
  tags: string[]
): Memory | null {
  // Verify the memory belongs to the user
  const memory = getMemory(memoryId);
  if (!memory || memory.contextId !== contextId) {
    return null;
  }

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE memories 
    SET text = ?, tags = ?, updated_at = ?, version = version + 1
    WHERE id = ?
  `);

  stmt.run(text, JSON.stringify(tags), now, memoryId);

  return getMemory(memoryId);
}

/**
 * Update only tags of an existing memory (selective add/remove)
 */
export function updateMemoryTags(
  memoryId: string,
  contextId: string,
  addTags?: string[],
  removeTags?: string[]
): Memory | null {
  // Verify the memory belongs to the user
  const memory = getMemory(memoryId);
  if (!memory || memory.contextId !== contextId) {
    return null;
  }

  let currentTags = [...memory.tags];

  // Remove tags
  if (removeTags && removeTags.length > 0) {
    currentTags = currentTags.filter((tag) => !removeTags.includes(tag));
  }

  // Add tags (avoiding duplicates)
  if (addTags && addTags.length > 0) {
    addTags.forEach((tag) => {
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
      }
    });
  }

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE memories 
    SET tags = ?, updated_at = ?, version = version + 1
    WHERE id = ?
  `);

  stmt.run(JSON.stringify(currentTags), now, memoryId);

  return getMemory(memoryId);
}

/**
 * Delete all facts for a memory
 */
export function deleteFactsForMemory(memoryId: string): number {
  const stmt = db.prepare(`DELETE FROM facts WHERE memory_id = ?`);
  const result = stmt.run(memoryId);
  return result.changes;
}

/**
 * Delete a specific memory by ID
 */
export function deleteMemory(memoryId: string, contextId: string): boolean {
  // Verify the memory belongs to the user
  const memory = getMemory(memoryId);
  if (!memory || memory.contextId !== contextId) {
    return false;
  }

  const stmt = db.prepare(`DELETE FROM memories WHERE id = ?`);
  const result = stmt.run(memoryId);
  return result.changes > 0;
}

/**
 * Delete all memories for a user
 */
export function deleteAllMemories(contextId: string): number {
  const stmt = db.prepare(`DELETE FROM memories WHERE context_id = ?`);
  const result = stmt.run(contextId);
  return result.changes;
}


// ============================================================================
// Tool Call Notes Operations
// ============================================================================

export interface ToolCallNote {
  id: string;
  contextId: string;
  toolName: string;
  noteType: "success" | "failure" | "pattern" | "guideline";
  content: string;
  parameters?: string[];
  errorMessage?: string;
  successPattern?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Get tool call notes for a specific tool
 */
export function getToolCallNotes(
  contextId: string,
  toolName: string,
  noteType?: string,
  limit: number = 10
): ToolCallNote[] {
  let sql = `
    SELECT * FROM tool_call_notes
    WHERE context_id = ? AND tool_name = ?
  `;
  const params: any[] = [contextId, toolName];
  
  if (noteType && noteType !== "all") {
    sql += ` AND note_type = ?`;
    params.push(noteType);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];
  
  return rows.map((row) => ({
    id: row.id,
    contextId: row.context_id,
    toolName: row.tool_name,
    noteType: row.note_type,
    content: row.content,
    parameters: row.parameters ? JSON.parse(row.parameters) : undefined,
    errorMessage: row.error_message,
    successPattern: row.success_pattern,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Add a new tool call note
 */
export function addToolCallNote(
  contextId: string,
  toolName: string,
  noteType: "success" | "failure" | "pattern" | "guideline",
  content: string,
  parameters?: string[],
  errorMessage?: string,
  successPattern?: string
): string {
  const id = nanoid();
  const now = Date.now();
  
  const stmt = db.prepare(`
    INSERT INTO tool_call_notes 
    (id, context_id, tool_name, note_type, content, parameters, error_message, success_pattern, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    contextId,
    toolName,
    noteType,
    content,
    parameters ? JSON.stringify(parameters) : null,
    errorMessage || null,
    successPattern || null,
    now,
    now
  );
  
  return id;
}

/**
 * Delete a tool call note by ID
 */
export function deleteToolCallNote(
  contextId: string,
  noteId: string
): boolean {
  const stmt = db.prepare(`
    DELETE FROM tool_call_notes 
    WHERE id = ? AND context_id = ?
  `);
  
  const result = stmt.run(noteId, contextId);
  return result.changes > 0;
}

/**
 * Get tool call note statistics (tool name and count)
 * Used for dynamic tool descriptions
 */
export function getToolCallNoteStats(
  contextId: string
): Array<{ toolName: string; count: number }> {
  const stmt = db.prepare(`
    SELECT tool_name, COUNT(*) as count
    FROM tool_call_notes
    WHERE context_id = ?
    GROUP BY tool_name
    ORDER BY count DESC, tool_name ASC
  `);
  
  const rows = stmt.all(contextId) as any[];
  return rows.map((row) => ({
    toolName: row.tool_name,
    count: row.count,
  }));
}

/**
 * Get facts that are missing embeddings for a specific embedding type
 * Returns facts that don't have entries in the target embedding table
 */
export function getFactsMissingEmbeddings(embeddingType: EmbeddingType): Array<{ id: string; text: string }> {
  const vectorTable = EMBEDDING_CONFIGS[embeddingType].tableName;
  
  const stmt = db.prepare(`
    SELECT f.id, f.text
    FROM facts f
    LEFT JOIN ${vectorTable} v ON f.id = v.fact_id
    WHERE v.fact_id IS NULL
  `);
  
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
  }));
}

/**
 * Get count of facts missing embeddings for a specific embedding type
 */
export function countFactsMissingEmbeddings(embeddingType: EmbeddingType): number {
  const vectorTable = EMBEDDING_CONFIGS[embeddingType].tableName;
  
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM facts f
    LEFT JOIN ${vectorTable} v ON f.id = v.fact_id
    WHERE v.fact_id IS NULL
  `);
  
  const row = stmt.get() as any;
  return row.count;
}

/**
 * Add embedding for an existing fact
 * Used when switching embedding modes to fill in missing embeddings
 */
export function addEmbeddingToFact(
  factId: string,
  embedding: number[],
  embeddingType: EmbeddingType
): void {
  const vectorTable = EMBEDDING_CONFIGS[embeddingType].tableName;
  
  const stmt = db.prepare(`
    INSERT INTO ${vectorTable} (fact_id, dim, unit_norm, embedding)
    VALUES (?, ?, 1, ?)
  `);
  
  stmt.run(factId, embedding.length, vectorToBlob(embedding));
}

