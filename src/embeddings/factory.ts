/**
 * Embedder Factory
 * 
 * Creates the appropriate embedder based on configuration
 */

import type { Embedder, LanguageMode, EmbeddingType } from "./types.js";
import { OpenAIEmbedder } from "./openai-embedder.js";
import { LocalEmbedder } from "./local-embedder.js";
import { validateOpenAIKey } from "./validation.js";
import { 
  getFactsMissingEmbeddings, 
  countFactsMissingEmbeddings, 
  addEmbeddingToFact 
} from "../operations.js";
import config from "../config.js";

let embedderInstance: Embedder | null = null;
let currentMode: EmbeddingType | null = null;

/**
 * Get or create the embedder instance (singleton)
 */
export function getEmbedder(): Embedder {
  if (!embedderInstance) {
    embedderInstance = createEmbedder();
  }
  return embedderInstance;
}

/**
 * Create embedder based on configuration
 * 
 * Priority:
 * 1. If OPENAI_API_KEY is set and valid → OpenAI embedder
 * 2. Otherwise → Local embedder (uses language_mode: 'en' or 'multilang')
 */
function createEmbedder(): Embedder {
  // OpenAI takes precedence if API key is available
  if (config.openai.apiKey) {
    console.error("✓ OpenAI API key detected, using OpenAI embeddings");
    currentMode = 'openai';
    return new OpenAIEmbedder(
      config.openai.apiKey,
      config.openai.embeddingModel,
      config.openai.embeddingDimension
    );
  }

  // Use local embeddings with language mode
  const mode = config.languageMode === 'en' ? 'local_english' : 'local_multilingual';
  console.error(`✓ No OpenAI key, using local embeddings (${config.languageMode})`);
  currentMode = mode;
  return new LocalEmbedder(config.languageMode);
}

/**
 * Switch embedding mode
 * 
 * @param mode - Target embedding mode
 * @param languageMode - For local modes, 'en' or 'multilang'
 * @throws Error if switching to OpenAI without valid key
 */
export async function switchEmbeddingMode(
  mode: EmbeddingType,
  languageMode?: LanguageMode
): Promise<{ 
  success: boolean; 
  message: string; 
  previousMode: EmbeddingType | null;
  missingEmbeddings: number;
  embeddedCount?: number;
  estimatedTime?: string;
}> {
  const previousMode = currentMode;

  // Check how many facts are missing embeddings for target mode
  const missingCount = countFactsMissingEmbeddings(mode);

  // Validate OpenAI mode
  if (mode === 'openai') {
    if (!config.openai.apiKey) {
      throw new Error(
        "Cannot switch to OpenAI mode: OPENAI_API_KEY not set. " +
        "Please set the environment variable and restart the server."
      );
    }

    const isValid = await validateOpenAIKey(config.openai.apiKey);
    if (!isValid) {
      throw new Error(
        "Cannot switch to OpenAI mode: API key validation failed. " +
        "Check your OPENAI_API_KEY or use local embedding mode."
      );
    }

    // Create new embedder
    embedderInstance = new OpenAIEmbedder(
      config.openai.apiKey,
      config.openai.embeddingModel,
      config.openai.embeddingDimension
    );
    currentMode = 'openai';

    // If there are missing embeddings, create them
    if (missingCount > 0) {
      console.error(`ℹ️  Found ${missingCount} facts without OpenAI embeddings`);
      console.error(`⏳ Embedding missing facts (estimated: ${estimateEmbeddingTime(missingCount, 'openai')})`);
      
      const startTime = Date.now();
      const factsToEmbed = getFactsMissingEmbeddings(mode);
      
      // Batch embed for efficiency
      let embedded = 0;
      const batchSize = 100;
      
      for (let i = 0; i < factsToEmbed.length; i += batchSize) {
        const batch = factsToEmbed.slice(i, i + batchSize);
        const texts = batch.map(f => f.text);
        const embeddings = await embedderInstance.embedBatch(texts);
        
        for (let j = 0; j < batch.length; j++) {
          addEmbeddingToFact(batch[j].id, embeddings[j], mode);
          embedded++;
        }
        
        if (embedded % 50 === 0) {
          console.error(`  Progress: ${embedded}/${missingCount} facts embedded`);
        }
      }
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`✓ Embedded ${embedded} facts in ${elapsed}s`);

      return {
        success: true,
        message: `Switched to OpenAI embeddings. Created ${embedded} missing embeddings in ${elapsed}s.`,
        previousMode,
        missingEmbeddings: missingCount,
        embeddedCount: embedded,
        estimatedTime: estimateEmbeddingTime(missingCount, 'openai'),
      };
    }

    return {
      success: true,
      message: "Switched to OpenAI embeddings. All facts already have OpenAI embeddings.",
      previousMode,
      missingEmbeddings: 0,
    };
  }

  // Switch to local mode
  const targetLanguageMode = languageMode || 
    (mode === 'local_english' ? 'en' : 'multilang');

  const modelInfo = targetLanguageMode === 'en' 
    ? "bge-small-en-v1.5 (~120MB)"
    : "paraphrase-multilingual-MiniLM-L12-v2 (~130MB)";

  embedderInstance = new LocalEmbedder(targetLanguageMode);
  currentMode = mode;

  // If there are missing embeddings, create them
  if (missingCount > 0) {
    console.error(`ℹ️  Found ${missingCount} facts without ${mode} embeddings`);
    console.error(`⏳ Embedding missing facts (estimated: ${estimateEmbeddingTime(missingCount, mode)})`);
    
    const startTime = Date.now();
    const factsToEmbed = getFactsMissingEmbeddings(mode);
    
    // Batch embed for efficiency
    let embedded = 0;
    const batchSize = 50; // Smaller batches for local to show progress
    
    for (let i = 0; i < factsToEmbed.length; i += batchSize) {
      const batch = factsToEmbed.slice(i, i + batchSize);
      const texts = batch.map(f => f.text);
      const embeddings = await embedderInstance.embedBatch(texts);
      
      for (let j = 0; j < batch.length; j++) {
        addEmbeddingToFact(batch[j].id, embeddings[j], mode);
        embedded++;
      }
      
      if (embedded % 25 === 0 || embedded === missingCount) {
        console.error(`  Progress: ${embedded}/${missingCount} facts embedded`);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`✓ Embedded ${embedded} facts in ${elapsed}s`);

    return {
      success: true,
      message: 
        `Switched to local ${targetLanguageMode} embeddings (${modelInfo}). ` +
        `Created ${embedded} missing embeddings in ${elapsed}s. ` +
        `Note: First use will download the model, which may take 1-3 minutes depending on connection.`,
      previousMode,
      missingEmbeddings: missingCount,
      embeddedCount: embedded,
      estimatedTime: estimateEmbeddingTime(missingCount, mode),
    };
  }

  return {
    success: true,
    message: 
      `Switched to local ${targetLanguageMode} embeddings (${modelInfo}). ` +
      `All facts already have ${mode} embeddings. ` +
      `Note: First use will download the model, which may take 1-3 minutes depending on connection.`,
    previousMode,
    missingEmbeddings: 0,
  };
}

/**
 * Estimate embedding time based on count and mode
 * @param count - Number of facts to embed
 * @param mode - Embedding mode
 * @returns Human-readable time estimate
 */
function estimateEmbeddingTime(count: number, mode: EmbeddingType): string {
  // Time per fact (in seconds)
  const timePerFact = mode === 'openai' ? 0.1 : 0.15; // OpenAI ~100ms, Local ~150ms
  
  const totalSeconds = count * timePerFact;
  
  if (totalSeconds < 10) {
    return "< 10 seconds";
  } else if (totalSeconds < 60) {
    return `${Math.ceil(totalSeconds / 10) * 10} seconds`;
  } else if (totalSeconds < 300) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minutes (${Math.floor(minutes / 5) * 5}-${Math.ceil(minutes / 5) * 5} minute range)`;
  }
}

/**
 * Get current embedding mode
 */
export function getCurrentMode(): EmbeddingType | null {
  return currentMode;
}

/**
 * Reset embedder instance (useful for testing or after config changes)
 */
export function resetEmbedder(): void {
  embedderInstance = null;
  currentMode = null;
}

// Export singleton instance
export const embedder = getEmbedder();

