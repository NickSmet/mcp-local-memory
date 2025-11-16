/**
 * Handler: switch_embedding_mode
 * 
 * Switch between embedding modes (OpenAI, local English, local multilingual)
 */

import { switchEmbeddingMode, getCurrentMode } from "../embeddings/factory.js";
import type { EmbeddingType, LanguageMode } from "../embeddings/types.js";

export async function handleSwitchEmbeddingMode(args: any) {
  const targetMode = args.mode as EmbeddingType;

  if (!targetMode) {
    throw new Error("mode parameter is required (openai, local_english, or local_multilingual)");
  }

  if (!['openai', 'local_english', 'local_multilingual'].includes(targetMode)) {
    throw new Error(
      `Invalid mode: ${targetMode}. Must be one of: openai, local_english, local_multilingual`
    );
  }

  try {
    const result = await switchEmbeddingMode(targetMode);

    const response: any = {
      success: true,
      current_mode: getCurrentMode(),
      previous_mode: result.previousMode,
      message: result.message,
      missing_embeddings: result.missingEmbeddings,
      note: targetMode.startsWith('local') 
        ? "Manual facts are required in local mode for add_memory and update_memory operations."
        : "Automatic fact extraction is available in OpenAI mode."
    };

    // Add embedding details if facts were embedded
    if (result.embeddedCount !== undefined) {
      response.embedded_count = result.embeddedCount;
      response.estimated_time = result.estimatedTime;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              current_mode: getCurrentMode(),
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

