/**
 * Configuration Management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { config as loadEnv } from "dotenv";
import type { LanguageMode } from "./embeddings/types.js";

// Load .env file if it exists
loadEnv();

export interface Config {
  sqlitePath: string;
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
  contextId: string;
  languageMode: LanguageMode; // 'en' or 'multilang' (only for local embeddings)
  lambda: number; // Tag boost factor
  enableToolCallNotes: boolean; // Enable tool call learning system
}

const CONFIG_DIR = join(homedir(), "Documents", "mcp-personal-memory");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const DEFAULT_SQLITE_PATH = join(CONFIG_DIR, "memory.db");

const DEFAULT_CONFIG: Config = {
  sqlitePath: process.env.SQLITE_PATH || DEFAULT_SQLITE_PATH,
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimension: 1536, // text-embedding-3-small dimension
  },
  contextId: process.env.CONTEXT_ID || "default",
  languageMode: (process.env.LANGUAGE_MODE as LanguageMode) || "multilang",
  lambda: 0.1, // Tag boost factor
  enableToolCallNotes: process.env.ENABLE_TOOL_CALL_NOTES !== "false", // Default: enabled
};

export function loadConfig(): Config {
  let baseConfig = DEFAULT_CONFIG;
  
  // Load saved config if it exists
  try {
    if (existsSync(CONFIG_PATH)) {
      const data = readFileSync(CONFIG_PATH, "utf-8");
      const savedConfig = JSON.parse(data);
      baseConfig = { ...DEFAULT_CONFIG, ...savedConfig };
    }
  } catch (error) {
    console.error("Error loading config, using defaults:", error);
  }
  
  // Environment variables always override saved config
  return {
    ...baseConfig,
    sqlitePath: process.env.SQLITE_PATH || baseConfig.sqlitePath,
    contextId: process.env.CONTEXT_ID || baseConfig.contextId,
    languageMode: (process.env.LANGUAGE_MODE as LanguageMode) || baseConfig.languageMode,
    enableToolCallNotes: process.env.ENABLE_TOOL_CALL_NOTES !== "false",
    openai: {
      ...baseConfig.openai,
      apiKey: process.env.OPENAI_API_KEY || baseConfig.openai.apiKey,
      model: process.env.OPENAI_MODEL || baseConfig.openai.model,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || baseConfig.openai.embeddingModel,
    },
  };
}

export function saveConfig(config: Config): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

// Initialize config
const config = loadConfig();
saveConfig(config); // Ensure config file exists

export default config;

