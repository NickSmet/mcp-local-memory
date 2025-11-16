/**
 * Embedding System Types
 */

export interface Embedder {
  /** Embed a single text */
  embedText(text: string): Promise<number[]>;
  
  /** Embed multiple texts in batch */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /** Get embedding dimension */
  getDimension(): number;
  
  /** Get embedding type identifier */
  getType(): EmbeddingType;
  
  /** Check if this embedder requires manual facts */
  requiresManualFacts(): boolean;
}

export type EmbeddingType = 'openai' | 'local_english' | 'local_multilingual';

export type LanguageMode = 'en' | 'multilang';

export interface EmbeddingConfig {
  type: EmbeddingType;
  dimension: number;
  tableName: string;
}

export const EMBEDDING_CONFIGS: Record<EmbeddingType, EmbeddingConfig> = {
  openai: {
    type: 'openai',
    dimension: 1536,
    tableName: 'fact_vectors_openai',
  },
  local_english: {
    type: 'local_english',
    dimension: 384, // bge-small-en-v1.5
    tableName: 'fact_vectors_local_en',
  },
  local_multilingual: {
    type: 'local_multilingual',
    dimension: 384, // paraphrase-multilingual-MiniLM-L12-v2
    tableName: 'fact_vectors_local_ml',
  },
};

