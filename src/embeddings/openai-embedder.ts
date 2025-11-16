/**
 * OpenAI Embedder
 * 
 * Uses OpenAI API for embeddings (text-embedding-3-small by default)
 */

import OpenAI from "openai";
import { normalize } from "../vector.js";
import type { Embedder, EmbeddingType } from "./types.js";

export class OpenAIEmbedder implements Embedder {
  private client: OpenAI;
  private model: string;
  private dimension: number;

  constructor(apiKey: string, model: string = "text-embedding-3-small", dimension: number = 1536) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.dimension = dimension;
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });
      return normalize(response.data[0].embedding);
    } catch (error: any) {
      this.handleOpenAIError(error);
      throw error; // Re-throw after logging
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });
      
      return response.data.map((item) => normalize(item.embedding));
    } catch (error: any) {
      this.handleOpenAIError(error);
      throw error; // Re-throw after logging
    }
  }

  private handleOpenAIError(error: any): void {
    if (error?.status === 401) {
      throw new Error(
        "OpenAI API authentication failed. Your API key is invalid. " +
        "Use the 'switch_embedding_mode' tool to switch to local embeddings, " +
        "or update your OPENAI_API_KEY environment variable."
      );
    } else if (error?.status === 429) {
      throw new Error(
        "OpenAI API rate limit exceeded. You've hit your quota or rate limit. " +
        "Consider switching to local embeddings using the 'switch_embedding_mode' tool, " +
        "or wait and try again later."
      );
    } else if (error?.status === 402) {
      throw new Error(
        "OpenAI API payment required. Your account needs payment information. " +
        "Use the 'switch_embedding_mode' tool to switch to local embeddings (no API key needed), " +
        "or add payment details to your OpenAI account."
      );
    } else if (error?.status === 500 || error?.status === 503) {
      throw new Error(
        "OpenAI API service error. OpenAI's servers are experiencing issues. " +
        "You can temporarily switch to local embeddings using 'switch_embedding_mode', " +
        "or try again in a few minutes."
      );
    }
    // For other errors, let the original error propagate
  }

  getDimension(): number {
    return this.dimension;
  }

  getType(): EmbeddingType {
    return 'openai';
  }

  requiresManualFacts(): boolean {
    return false;
  }
}

