# Configuration Examples

Example configurations for MCP Local Memory. All use `npx` for easy installation.

---

## 📄 Files

### `basic-offline.json`
**Offline mode - No API key needed**
- ✅ Free forever
- ✅ Works offline
- ✅ ~130MB model download on first use
- ❌ Manual fact extraction required

```bash
# Use this if: You want free, offline memory
```

---

### `with-openai.json`
**Recommended - With OpenAI API key**
- ✅ Automatic memory organization
- ✅ Smart fact extraction
- ✅ Better search results
- 💰 ~$0.02-0.05/month

```bash
# Use this if: You want the best experience
```

---

### `advanced-config.json`
**Advanced - Custom settings**
- Custom context ID (`work`)
- Custom database path
- OpenAI API key

```bash
# Use this if: You want custom paths or contexts
```

---

### `multiple-contexts.json`
**Multiple contexts - Separate work/personal**
- Two separate memory spaces
- Different contexts for different uses
- Memories don't mix between contexts

```bash
# Use this if: You want isolated memory spaces
```

---

## 🚀 How to Use

1. **Choose a config** from above
2. **Copy the contents** of the JSON file
3. **Paste into your MCP config:**
   - **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Cursor:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
4. **Replace placeholders** (like `sk-your-openai-api-key-here`)
5. **Restart** your AI client

---

## 🔑 Get OpenAI API Key

Visit: [OpenAI API keys](https://platform.openai.com/api-keys)

---

## 💡 Tips

- **Start simple:** Use `with-openai.json` for best results
- **Go offline:** Use `basic-offline.json` if you want free/offline
- **Separate contexts:** Use `multiple-contexts.json` for work/personal separation
- **Custom paths:** Use `advanced-config.json` as a starting point

---

## 📚 More Info

See the main [README.md](../README.md) and `docs/SPEC-INDEX.md` for full documentation.

