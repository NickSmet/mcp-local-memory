/**
 * Handler: get_context_tags
 * 
 * Get all available context tags for the user, with optional regex filter
 * Returns metadata about each tag (count, first/last memory dates)
 */

import config from "../config.js";
import { getAllTags } from "../operations.js";

const MAX_TAGS_DISPLAY = 150;
const TRUNCATE_TO = 100;

export async function handleGetContextTags(args: any) {
  const { regex } = args;
  
  const allTags = getAllTags(config.contextId, regex);
  const totalCount = allTags.length;
  let tags = allTags;
  let truncated = false;
  let message: string | undefined;

  // If too many tags, truncate and add a message
  if (totalCount > MAX_TAGS_DISPLAY) {
    tags = allTags.slice(0, TRUNCATE_TO);
    truncated = true;
    message = `Returning first ${TRUNCATE_TO} context tags out of ${totalCount}. For a more precise search, use the regex filter to narrow down results.`;
  }

  // Convert timestamps to ISO strings for better readability
  const formattedTags = tags.map((tagData) => ({
    tag: tagData.tag,
    memory_count: tagData.memory_count,
    first_memory_date: new Date(tagData.first_memory_date).toISOString(),
    last_memory_date: new Date(tagData.last_memory_date).toISOString(),
  }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: totalCount,
            tags: formattedTags,
            filtered: !!regex,
            truncated,
            ...(message && { message }),
          },
          null,
          2
        ),
      },
    ],
  };
}

