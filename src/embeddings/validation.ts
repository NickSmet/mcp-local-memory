/**
 * OpenAI Key Validation
 * 
 * Validates OpenAI API key by making a test embedding call
 */

import OpenAI from "openai";

/**
 * Validate OpenAI API key
 * Returns true if valid, false if invalid/missing
 */
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim() === "") {
    return false;
  }

  try {
    const client = new OpenAI({ apiKey });
    
    // Make a minimal test call
    await client.embeddings.create({
      model: "text-embedding-3-small",
      input: "test",
    });
    
    return true;
  } catch (error: any) {
    // Log the error for debugging
    if (error?.status === 401) {
      console.error("OpenAI API key is invalid");
    } else if (error?.status === 429) {
      console.error("OpenAI API quota exceeded");
      // Still return true - key is valid, just quota issue
      return true;
    } else if (error?.status === 402) {
      console.error("OpenAI API payment required");
      // Still return true - key is valid, just payment issue
      return true;
    } else {
      console.error("OpenAI API validation error:", error.message);
    }
    
    return false;
  }
}

