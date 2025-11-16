/**
 * Local Embedder
 * 
 * Uses @xenova/transformers for local embeddings (no API required)
 * Supports both English-only and multilingual models
 */

import { normalize } from "../vector.js";
import type { Embedder, EmbeddingType, LanguageMode } from "./types.js";

const MODEL_CONFIGS = {
  en: {
    model: 'Xenova/bge-small-en-v1.5',
    dimension: 384,
    type: 'local_english' as EmbeddingType,
  },
  multilang: {
    model: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    dimension: 384,
    type: 'local_multilingual' as EmbeddingType,
  },
};

// Shared download state across all instances
let downloadProgress = {
  isDownloading: false,
  startTime: 0,
  modelName: '',
};

export class LocalEmbedder implements Embedder {
  private model: any;
  private ready: Promise<void> | null = null;
  private dimension: number;
  private type: EmbeddingType;
  private modelName: string;

  constructor(languageMode: LanguageMode = 'multilang') {
    const config = MODEL_CONFIGS[languageMode];
    this.dimension = config.dimension;
    this.type = config.type;
    this.modelName = config.model;
    // Don't initialize immediately - wait for first use
  }

  static getDownloadStatus(): { isDownloading: boolean; elapsedSeconds: number; modelName: string } {
    return {
      isDownloading: downloadProgress.isDownloading,
      elapsedSeconds: downloadProgress.isDownloading 
        ? Math.floor((Date.now() - downloadProgress.startTime) / 1000)
        : 0,
      modelName: downloadProgress.modelName,
    };
  }

  private async init(): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = (async () => {
      try {
        // Set download state
        downloadProgress.isDownloading = true;
        downloadProgress.startTime = Date.now();
        downloadProgress.modelName = this.modelName;

        console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.error(`⬇️  Downloading local embedding model: ${this.modelName}`);
        console.error(`   Size: ~${this.type === 'local_english' ? '120' : '130'}MB`);
        console.error(`   This is a one-time download. Subsequent uses will be instant.`);
        console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Dynamic import to avoid loading transformers until needed
        const { pipeline } = await import('@xenova/transformers');
        
        this.model = await pipeline(
          'feature-extraction',
          this.modelName,
          { quantized: true } // Use quantized for smaller size/faster
        );
        
        console.error(`✓ Model loaded successfully (${this.dimension}D embeddings)`);
        
        // Clear download state
        downloadProgress.isDownloading = false;
      } catch (error: any) {
        downloadProgress.isDownloading = false;
        console.error(`❌ Failed to load model: ${error.message}`);
        throw new Error(
          `Failed to load local embedding model. ` +
          `If @xenova/transformers is not installed, run: npm install @xenova/transformers. ` +
          `Or switch to OpenAI mode using the switch_embedding_mode tool.`
        );
      }
    })();

    return this.ready;
  }

  async embedText(text: string): Promise<number[]> {
    await this.init();
    
    const output = await this.model(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert to regular array and normalize
    const embedding = Array.from(output.data) as number[];
    return normalize(embedding);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    await this.init();
    
    const output = await this.model(texts, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert to regular arrays and normalize
    const embeddings: number[][] = [];
    const dataArray = Array.from(output.data) as number[];
    
    for (let i = 0; i < texts.length; i++) {
      const start = i * this.dimension;
      const end = start + this.dimension;
      const embedding = dataArray.slice(start, end);
      embeddings.push(normalize(embedding));
    }
    
    return embeddings;
  }

  getDimension(): number {
    return this.dimension;
  }

  getType(): EmbeddingType {
    return this.type;
  }

  requiresManualFacts(): boolean {
    return true;
  }
}

