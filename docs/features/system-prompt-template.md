# System Prompt Template

**Status:** ✅ Complete  
**Purpose:** Copy/paste guidance for MCP clients/agents integrating with this server.

## Working with Memory

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
- **Meta-patterns emerge** (common workflows/preferences)

**What NOT to store as updates:**
- Incremental progress percentages (40% → 60% done)
- Temporary states that will change soon
- Minor task status changes within the same phase

## Tool Call Learning & Error Prevention

If you use a separate “tool-call-notes” tool in your agent:

- Check notes before tool calls when uncertain
- Record failures (with exact error) immediately
- Record success patterns after troubleshooting

## Related Docs

- `src/SPEC.md` (tool contracts)
- `docs/features/direct-access-only.md` (when to use `direct_access_only`)

