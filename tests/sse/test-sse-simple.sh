#!/bin/bash

echo "Testing MCP Local Memory SSE Interface on http://localhost:3133"
echo "================================================================"
echo ""

# Test 1: List tools
echo "1. Testing tools/list..."
curl -X POST http://localhost:3133 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' 2>&1 | jq . || echo "Error"

echo ""
echo ""

# Test 2: Call list_memories
echo "2. Testing list_memories tool..."
curl -X POST http://localhost:3133 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_memories",
      "arguments": {
        "limit": 3
      }
    }
  }' 2>&1 | jq . || echo "Error"

echo ""
echo "Tests complete!"

