/**
 * Handler: update_memory
 * 
 * Update an existing memory with new text/tags and refresh facts
 * OR selectively add/remove tags without changing text
 */

import config from "../config.js";
import { db } from "../database.js";
import { splitIntoFacts } from "../openai.js";
import { embedder } from "../embeddings/factory.js";
import { updateMemory, updateMemoryTags, deleteFactsForMemory, createFact } from "../operations.js";
import { formatMemory, formatFact } from "../format.js";
import type { Fact } from "../types.js";

export async function handleUpdateMemory(args: any) {
  const { memory_id, text, context_tags, facts, add_tags, remove_tags } = args;

  if (!memory_id) {
    throw new Error("memory_id is required");
  }

  // Check if this is a tag-only update
  const isTagOnlyUpdate = !text && (add_tags || remove_tags);

  if (isTagOnlyUpdate) {
    // Tag-only update (efficient, no fact re-processing)
    const updatedMemory = updateMemoryTags(
      memory_id,
      config.contextId,
      add_tags as string[] | undefined,
      remove_tags as string[] | undefined
    );

    if (!updatedMemory) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                message: "Memory not found or does not belong to context",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Return only the updated tags
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Tags updated",
              context_tags: updatedMemory.tags,
              memory_id: updatedMemory.id,
              updated_at: new Date(updatedMemory.updatedAt).toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Full update (text + tags + facts)
  if (!text) {
    throw new Error("text is required for full memory update");
  }

  const contextTags = (context_tags as string[]) || [];
  const manualFacts = facts as string[] | undefined;

  // Check if manual facts are required
  if (embedder.requiresManualFacts() && (!manualFacts || manualFacts.length === 0)) {
    throw new Error(
      "Manual facts are required when using local embedding mode. " +
      "Provide a 'facts' array, or set OPENAI_API_KEY environment variable " +
      "to enable automatic fact extraction."
    );
  }

  // Update memory text and tags
  const updatedMemory = updateMemory(memory_id, config.contextId, text, contextTags);

  if (!updatedMemory) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              message: "Memory not found or does not belong to context",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Delete old facts
  deleteFactsForMemory(memory_id);

  let newFacts: Fact[] = [];
  let aiExtracted = false;

  // Determine fact texts
  let factTexts: string[];

  if (manualFacts && manualFacts.length > 0) {
    // Use manually provided facts
    factTexts = manualFacts;
    aiExtracted = false;
  } else {
    // Extract facts using LLM (only available with OpenAI)
    factTexts = await splitIntoFacts(text);
    aiExtracted = true;
  }

  // Embed all facts in batch
  const embeddings = await embedder.embedBatch(factTexts);
  const embeddingType = embedder.getType();

  // Create new facts in transaction
  const insertFacts = db.transaction(() => {
    const facts: Fact[] = [];
    for (let i = 0; i < factTexts.length; i++) {
      const fact = createFact(memory_id, factTexts[i], embeddings[i], embeddingType);
      facts.push(fact);
    }
    return facts;
  });

  newFacts = insertFacts();

  // Build response based on whether AI extraction was used
  const response: any = {
    success: true,
    memory: formatMemory(updatedMemory),
    message: `Updated memory with ${newFacts.length} facts`,
  };

  // Only include facts if AI extraction was used
  if (aiExtracted) {
    response.facts = newFacts.map(formatFact);
    response.ai_extracted = true;
  } else {
    response.facts_count = newFacts.length;
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

