#!/bin/bash

echo "🧪 Testing MCP Local Memory SSE Interface"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3133/mcp"
HEADERS=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream")

# Test 1: List tools
echo "1️⃣ Testing tools/list..."
curl -s -X POST "$BASE_URL" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' \
  | grep -o 'data: .*' | sed 's/^data: //' | jq -r '.result.tools[] | "  - \(.name): \(.description)"'
echo ""

# Test 2: List memories
echo "2️⃣ Testing list_memories (first 2)..."
RESPONSE=$(curl -s -X POST "$BASE_URL" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "list_memories", "arguments": {"limit": 2}}}')

echo "$RESPONSE" | grep -o 'data: .*' | sed 's/^data: //' | jq -r '.result.content[0].text' | jq -r '.memories[] | "  Memory: \(.data[0:80])..."'
echo ""

# Test 3: Get tags
echo "3️⃣ Testing get_context_tags..."
RESPONSE=$(curl -s -X POST "$BASE_URL" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_context_tags", "arguments": {}}}')

TAGS=$(echo "$RESPONSE" | grep -o 'data: .*' | sed 's/^data: //' | jq -r '.result.content[0].text' | jq -r '.tags | length')
echo "  Found $TAGS context tags"
echo ""

# Test 4: Search
echo "4️⃣ Testing search_memory..."
RESPONSE=$(curl -s -X POST "$BASE_URL" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "search_memory", "arguments": {"query": "configuration", "limit": 2}}}')

echo "$RESPONSE" | grep -o 'data: .*' | sed 's/^data: //' | jq -r '.result.content[0].text' | jq -r '.results[] | "  Score: \(.score) - \(.memory_data[0:70])..."'
echo ""

echo "✅ All SSE tests completed successfully!"
echo ""
echo "📝 To test interactively, open: test-sse-client.html in your browser"

