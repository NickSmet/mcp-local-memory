/**
 * Handler: search_memory
 * 
 * Semantic search through facts with optional tag filtering
 */

import config from "../config.js";
import { embedder } from "../embeddings/factory.js";
import { searchFacts } from "../operations.js";
import { formatMemory } from "../format.js";

export async function handleSearchMemory(args: any) {
  const query = args.query as string;
  const contextTags = (args.context_tags as string[]) || undefined;
  const limit = (args.limit as number) || 10;

  if (!query) {
    throw new Error("Query is required");
  }

  // Embed query
  const queryVector = await embedder.embedText(query);
  const embeddingType = embedder.getType();

  // Search facts (tags used for soft boosting, not hard filtering)
  const results = searchFacts(
    config.contextId,
    queryVector,
    embeddingType,
    limit,
    contextTags, // Boost tags (case-insensitive partial match)
    config.lambda
  );

  // Group by memory to deduplicate
  const memoriesMap = new Map<string, any>();
  results.forEach((fact) => {
    if (!memoriesMap.has(fact.memoryId)) {
      memoriesMap.set(fact.memoryId, {
        memory: fact.memory ? formatMemory(fact.memory) : null,
        facts: [],
        maxScore: fact.score,
      });
    }
    memoriesMap.get(fact.memoryId)!.facts.push({
      id: fact.id,
      text: fact.text,
      score: fact.score,
    });
  });

  const memories = Array.from(memoriesMap.values())
    .sort((a, b) => b.maxScore - a.maxScore)
    .slice(0, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            query,
            results: memories.length,
            memories,
          },
          null,
          2
        ),
      },
    ],
  };
}

