/**
 * Database Setup and Schema
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import config from "./config.js";

export type DB = Database.Database;

/**
 * Initialize database connection and schema
 */
export function initDatabase(): DB {
  // Ensure DB directory exists
  const dbDir = dirname(config.sqlitePath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(config.sqlitePath);
  db.pragma("journal_mode = WAL");

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL,
      text TEXT NOT NULL,
      tags TEXT NOT NULL, -- JSON array
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_memories_context_id ON memories(context_id);
    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);

    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_facts_memory_id ON facts(memory_id);

    -- OpenAI embeddings (1536D)
    CREATE TABLE IF NOT EXISTS fact_vectors_openai (
      fact_id TEXT PRIMARY KEY,
      dim INTEGER NOT NULL DEFAULT 1536,
      unit_norm INTEGER NOT NULL DEFAULT 1,
      embedding BLOB NOT NULL,
      FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
    );

    -- Local English embeddings (384D)
    CREATE TABLE IF NOT EXISTS fact_vectors_local_en (
      fact_id TEXT PRIMARY KEY,
      dim INTEGER NOT NULL DEFAULT 384,
      unit_norm INTEGER NOT NULL DEFAULT 1,
      embedding BLOB NOT NULL,
      FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
    );

    -- Local Multilingual embeddings (384D)
    CREATE TABLE IF NOT EXISTS fact_vectors_local_ml (
      fact_id TEXT PRIMARY KEY,
      dim INTEGER NOT NULL DEFAULT 384,
      unit_norm INTEGER NOT NULL DEFAULT 1,
      embedding BLOB NOT NULL,
      FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
    );

    -- Tool call notes for learning from successes and failures
    CREATE TABLE IF NOT EXISTS tool_call_notes (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      note_type TEXT NOT NULL, -- 'success', 'failure', 'pattern', 'guideline'
      content TEXT NOT NULL,
      parameters TEXT, -- JSON array of parameter names that worked/failed
      error_message TEXT, -- For failures: what went wrong
      success_pattern TEXT, -- For successes: what worked
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tool_call_notes_context_tool 
      ON tool_call_notes(context_id, tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_call_notes_type 
      ON tool_call_notes(note_type);
  `);

  return db;
}

// Export singleton database instance
export const db: DB = initDatabase();

