/**
 * Handler: add_memory
 * 
 * Add a new memory with manual or automatic fact extraction
 */

import config from "../config.js";
import { db } from "../database.js";
import { splitIntoFacts } from "../openai.js";
import { embedder } from "../embeddings/factory.js";
import { createMemory, createFact } from "../operations.js";
import { formatMemory, formatFact } from "../format.js";
import type { Memory, Fact } from "../types.js";

export async function handleAddMemory(args: any) {
  const text = args.text as string;
  const contextTags = (args.context_tags as string[]) || [];
  const manualFacts = args.facts as string[] | undefined;

  if (!text) {
    throw new Error("Text is required");
  }

  // Check if manual facts are required
  if (embedder.requiresManualFacts() && (!manualFacts || manualFacts.length === 0)) {
    throw new Error(
      "Manual facts are required when using local embedding mode. " +
      "Provide a 'facts' array, or set OPENAI_API_KEY environment variable " +
      "to enable automatic fact extraction."
    );
  }

  let factTexts: string[];
  let aiExtracted = false;

  if (manualFacts && manualFacts.length > 0) {
    // Use manually provided facts
    factTexts = manualFacts;
    aiExtracted = false;
  } else {
    // Split memory into facts using LLM (only available with OpenAI)
    factTexts = await splitIntoFacts(text);
    aiExtracted = true;
  }

  // Embed all facts in batch
  const embeddings = await embedder.embedBatch(factTexts);
  const embeddingType = embedder.getType();

  // Create memory and facts in transaction
  const insertMemoriesAndFacts = db.transaction(() => {
    const memory = createMemory(config.contextId, text, contextTags);
    const facts: Fact[] = [];

    for (let i = 0; i < factTexts.length; i++) {
      const fact = createFact(memory.id, factTexts[i], embeddings[i], embeddingType);
      facts.push(fact);
    }

    return { memory, facts };
  });

  const result = insertMemoriesAndFacts();

  // Build response based on whether AI extraction was used
  const response: any = {
    success: true,
    memory: formatMemory(result.memory),
    message: `Added memory with ${result.facts.length} facts`,
  };

  // Only include facts if AI extraction was used
  if (aiExtracted) {
    response.facts = result.facts.map(formatFact);
    response.ai_extracted = true;
  } else {
    response.facts_count = result.facts.length;
    response.ai_extracted = false;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

