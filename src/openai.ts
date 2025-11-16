/**
 * OpenAI Operations
 * 
 * LLM interactions: fact extraction and embeddings
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import config from "./config.js";
import { normalize } from "./vector.js";

const openaiClient = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Embed a single text string
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: config.openai.embeddingModel,
    input: text,
  });
  return normalize(response.data[0].embedding);
}

/**
 * Embed multiple texts in batch
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const response = await openaiClient.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts,
  });
  
  return response.data.map((item) => normalize(item.embedding));
}

const FactExtraction = z.object({
  facts: z.array(z.string()).min(1).max(4),
});

/**
 * Split memory text into atomic facts using LLM
 */
export async function splitIntoFacts(memoryText: string): Promise<string[]> {
  const response = await openaiClient.responses.parse({
    model: config.openai.model,
    input: [
      { 
        role: "system", 
        content: `You extract discrete facts from memory entries.

CRITICAL RULES:
1. Extract ONLY what is explicitly stated - no inference, no expansion, no interpretation
2. Each fact is one complete semantic unit from the original text
3. Preserve the exact meaning and wording from the source
4. If the memory is a single statement (e.g., "User likes ice-cream"), return it as ONE fact unchanged
5. If the memory contains multiple statements, extract 2-4 separate facts
6. DO NOT add context, implications, or related information not present in the original

Examples:
- Input: "User likes ice-cream" → Output: ["User likes ice-cream"]
- Input: "User likes ice-cream. Prefers chocolate flavor." → Output: ["User likes ice-cream", "User prefers chocolate flavor ice-cream"]`
      },
      { 
        role: "user", 
        content: memoryText
      },
    ],
    text: {
      format: zodTextFormat(FactExtraction, "fact_extraction"),
    },
  });

  return response.output_parsed?.facts || [];
}