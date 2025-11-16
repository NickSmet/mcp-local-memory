# MCP Local Memory

Lightweight, steerable, local memory tool for your AI (SQLite + local embedding model, optional OpenAI support).

Let your agent remember whatever you want: preferences, project details, or even prompts for reuse. From how memories are structured and retrieved to how they're updated and deleted -- it's all up to you and your prompt.

Designed for personal use with 2-3K stored memories.

## Installation

Add this to your AI client's MCP config file:

**Option A: Local**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "mcp-local-memory"]
    }
  }
}
```

**Why go local?**
- Free
- No API keys needed
- If your AI agent app also uses a locally-running model -- your data never leaves your computer

**Trade-offs:** 
- Setup downloads a ~130MB model during configuration (one-time). 
- Small performance overhead of using the local model.
- Your AI agent will need to be slightly more explicit when saving memories.
- Slightly lower retrieval accuracy


**Option B: With OpenAI API key**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "mcp-local-memory"],
      "env": {
        "OPENAI_API_KEY": "your-key-here"
      }
    }
  }
}
```

OpenAI API key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Why use OpenAI?**
Somewhat better performance due to:
- OpenAI embedding model is better than a locally-running one
- Memory tool will use a fast OpenAI model to better structure memory when saving

**Cost:** $5 will last you for months

<u>**Note**: In both 'Local' and 'OpeanAI' mode, all your memories are stored locally.</u>
(default path is `~/Documents/mcp-personal-memory/memory.db`)

---

## What Can It Do?

Once installed, your AI assistant can:

**Remember things you tell it:**
```
You: "Remember: I prefer TypeScript over JavaScript"
AI: ✓ Saved in memory
```

```
You: "Store key information about this project we just discussed"
AI: ✓ 8 memories saved
```

**Recall information later:**
```
You: "What programming language do I prefer?"
AI: [Searches memory] You prefer TypeScript over JavaScript
```

```
You: "What's the main Jira Epic for this project?"
AI: [Searches memory] It's [ABC-123](https://example.atlassian.net/browse/ABC-123)
```

**Update/Organize Memories:**
```
You: "Hey, pls retrieve all the memories we've had about project ABC. Now that 
     there is a clear outline, pls structure them by frontend and backend. 
     Remove redundant memories. If you find conflicting memories -- ask me 
     before proceeding."

AI: [Searches memories for "project ABC"]
    Found 8 memories. I've organized them by adding clear tags:
    
    - 3 memories didn't have tags → added "frontend" tag
    - 4 memories had vague tags → updated to "backend" tag  
    - 1 memory was redundant (duplicate deployment info) → deleted
    
    Now structured as:
    
    Frontend (3 memories):
    - React + TypeScript stack
    - UI design in Figma, link: [...]
    - Deployment: Vercel
    
    Backend (4 memories):
    - Node.js API with Express
    - Database APIs
    - Database performance considerations
    - Hosted on Railway
    - API docs at [...]
    
    ⚠️ Conflict found: Memory bnL9Df8a says backend uses MongoDB, but memory Asq8Y6kq 
    (created recently) mentions CosmosDB. Which is correct?
```

## System Prompt Example

Customizing the system prompt will greatly affect how your agent uses the tool.
Here are examples of what an adequate system prompt may include:

```

### Working with Memory

Your memory tool helps maintain context across conversations. Use it thoughtfully:

**When to retrieve from memory:**
- User mentions something that could benefit from past context
- Information from other sources seems incomplete or could be enriched
- You need account IDs, project details, or other recurring facts
- **User gives you a task without full context—search memory to understand connections and background**

**When to update memory:**
- Important facts or connections emerge from the conversation
- Actions or decisions result in changed understanding
- **Project phase transitions** (started → in development → testing → deployed → production)
- **Major milestones reached** (infrastructure deployed, API complete, feature shipped)
- **New features or capabilities added** that weren't in original scope
- **Corrections to outdated information** (especially when you're corrected by the user)
- **Key URLs, endpoints, or deployment locations** discovered or changed
- **Meta-patterns emerge** (e.g., "when user asks X, they typically mean Y" or common workflows/preferences)

**What NOT to store as updates:**
- Incremental progress percentages (40% → 60% done)
- Temporary states that will change soon ("currently debugging X")
- Information already well-captured elsewhere unless it provides quick-reference value
- Minor task status changes within the same phase

**Think of memory as "overall situational awareness":**
- Can we do X? (features/capabilities)
- Where is Y? (URLs, locations, resources)
- What phase is Z in? (not started / active development / testing / production)
- How does A relate to B? (architecture, dependencies, relationships)

If you've already retrieved relevant memories during this conversation, you can update them directly without re-checking. Otherwise, search first to see what exists.
```

> 💡 **More advanced usage:** See [README-COMPLETE.md](./README-COMPLETE.md) for technical details, tool call notes system, and advanced features.

## Advanced Configuration

### Separate Work & Personal Memories

Add `CONTEXT_ID` to your config:

```json
{
  "memory-work": {
    "command": "npx",
    "args": ["-y", "mcp-local-memory"],
    "env": {
      "OPENAI_API_KEY": "your-key",
      "CONTEXT_ID": "work"
    }
  },
  "memory-personal": {
    "command": "npx",
    "args": ["-y", "mcp-local-memory"],
    "env": {
      "OPENAI_API_KEY": "your-key",
      "CONTEXT_ID": "personal"
    }
  }
}
```

Now you have two separate memory spaces that don't mix.

### Custom Database Location

Add `SQLITE_PATH` to your config:

```json
{
  "env": {
    "SQLITE_PATH": "/path/to/your/memory.db"
  }
}
```

Useful for:
- Syncing memories across devices (put DB in Dropbox/iCloud)
- Backing up to specific locations
- Multiple users on same computer

### Switch Between OpenAI and Offline

Your AI can switch modes if needed:
- Ask: "Switch to offline memory mode"
- AI will use the `switch_embedding_mode` tool
- Useful if OpenAI API has issues or you want to go offline

## For Developers

This is a user guide. For technical documentation, see:
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - How it works internally
- [SYSTEM_PROMPT_TEMPLATE.md](./docs/SYSTEM_PROMPT_TEMPLATE.md) - Ready-to-use prompt template for AI agents

**More examples:** Check the [examples/](./examples/) folder for different configuration options.

## Privacy & Data

- **Local storage:** All memories stored on your computer
- **OpenAI mode:** Sends memory text to OpenAI for processing (subject to OpenAI's privacy policy)
- **Your control:** Delete `memory.db` to erase everything

## License

MIT - Use freely for personal or commercial projects

---

**Questions or issues?** Open an issue on GitHub or check the technical documentation above.
