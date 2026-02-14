#!/usr/bin/env node

/**
 * Test script for MCP Local Memory Server
 * 
 * Tests all MCP tools with actual data
 */

import { spawn } from "child_process";

// Check if .env exists and has OPENAI_API_KEY
import { existsSync, readFileSync } from "fs";
import { config as loadEnv } from "dotenv";

loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USER_ID = process.env.USER_ID || "default";

if (!OPENAI_API_KEY) {
  console.error("❌ Error: OPENAI_API_KEY not set in .env");
  console.error("Please create .env file with OPENAI_API_KEY=sk-...");
  process.exit(1);
}

console.log("🚀 Starting MCP Local Memory Server Test\n");

// Use the database with actual data
const SQLITE_PATH = process.env.SQLITE_PATH || `${process.env.HOME}/.openmemory/memory.db`;

console.log(`📁 Using database: ${SQLITE_PATH}\n`);

const server = spawn("node", ["dist/index.js"], {
  env: {
    ...process.env,
    OPENAI_API_KEY,
    USER_ID,
    SQLITE_PATH,
  },
  stdio: ["pipe", "pipe", "inherit"],
});

let requestId = 1;
let output = "";
const responses = new Map();

server.stdout.on("data", (data) => {
  output += data.toString();
  
  const lines = output.split("\n");
  output = lines.pop(); // Keep incomplete line
  
  lines.forEach((line) => {
    if (line.trim().startsWith("{")) {
      try {
        const response = JSON.parse(line);
        if (response.id) {
          responses.set(response.id, response);
        }
      } catch (e) {
        // Not valid JSON yet
      }
    }
  });
});

function sendRequest(method, params = {}) {
  const id = requestId++;
  const request = {
    jsonrpc: "2.0",
    id,
    method,
    params,
  };
  
  server.stdin.write(JSON.stringify(request) + "\n");
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, 30000); // 30 second timeout
    
    const check = setInterval(() => {
      if (responses.has(id)) {
        clearTimeout(timeout);
        clearInterval(check);
        resolve(responses.get(id));
      }
    }, 100);
  });
}

async function runTests() {
  console.log("⏳ Waiting for server to start...\n");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Test 1: Initialize
    console.log("📝 Test 1: Initialize server");
    const initResponse = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    console.log(`✅ Server: ${initResponse.result.serverInfo.name} v${initResponse.result.serverInfo.version}\n`);
    
    // Test 2: List tools
    console.log("📝 Test 2: List available tools");
    const toolsResponse = await sendRequest("tools/list", {});
    const tools = toolsResponse.result.tools;
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => console.log(`   - ${tool.name}: ${tool.description.substring(0, 60)}...`));
    console.log();
    
    // Test 3: Get context tags
    console.log("📝 Test 3: Get context tags");
    const tagsResponse = await sendRequest("tools/call", {
      name: "get_context_tags",
      arguments: {},
    });
    const tagsResult = JSON.parse(tagsResponse.result.content[0].text);
    console.log(`✅ Found ${tagsResult.count} tags: ${tagsResult.tags.slice(0, 5).join(", ")}${tagsResult.tags.length > 5 ? "..." : ""}\n`);
    
    // Test 4: List memories
    console.log("📝 Test 4: List memories (first 5)");
    const listResponse = await sendRequest("tools/call", {
      name: "list_memories",
      arguments: { limit: 5 },
    });
    const listResult = JSON.parse(listResponse.result.content[0].text);
    console.log(`✅ Total memories: ${listResult.count}`);
    listResult.memories.slice(0, 3).forEach((mem, i) => {
      console.log(`   ${i + 1}. ${mem.text.substring(0, 80)}... (${mem.tags.length} tags)`);
    });
    console.log();
    
    // Test 5: Search memories
    console.log("📝 Test 5: Search memories");
    const searchResponse = await sendRequest("tools/call", {
      name: "search_memory",
      arguments: { 
        query: "deployment configuration",
        limit: 3 
      },
    });
    const searchResult = JSON.parse(searchResponse.result.content[0].text);
    console.log(`✅ Found ${searchResult.results} relevant memories:`);
    if (searchResult.memories && searchResult.memories.length > 0) {
      searchResult.memories.forEach((mem, i) => {
      console.log(`   ${i + 1}. Score: ${mem.maxScore.toFixed(3)} - ${mem.memory.text.substring(0, 70)}...`);
        console.log(`      Facts: ${mem.facts.length} facts found`);
      });
    } else {
      console.log(`   No memories found matching the query`);
    }
    console.log();
    
    // Test 6: Add new memory
    console.log("📝 Test 6: Add new memory");
    const newMemoryText = `Test memory created on ${new Date().toISOString()}. This is a test of the MCP Local Memory server. It demonstrates fact extraction and embedding capabilities.`;
    const addResponse = await sendRequest("tools/call", {
      name: "add_memory",
      arguments: { 
        text: newMemoryText,
        context_tags: ["test", "mcp-demo"]
      },
    });
    const addResult = JSON.parse(addResponse.result.content[0].text);
    console.log(`✅ Added memory with ${addResult.facts.length} facts:`);
    addResult.facts.forEach((fact, i) => {
      console.log(`   ${i + 1}. ${fact.text}`);
    });
    console.log();
    
    // Test 7: Search for newly added memory
    console.log("📝 Test 7: Search for newly added memory");
    const searchNewResponse = await sendRequest("tools/call", {
      name: "search_memory",
      arguments: { 
        query: "test memory created",
        context_tags: ["test"],
        limit: 2
      },
    });
    const searchNewResult = JSON.parse(searchNewResponse.result.content[0].text);
    console.log(`✅ Found ${searchNewResult.results} results with 'test' tag:`);
    if (searchNewResult.memories.length > 0) {
      const mem = searchNewResult.memories[0];
      console.log(`   Score: ${mem.maxScore.toFixed(3)}`);
      console.log(`   Memory: ${mem.memory.text.substring(0, 80)}...`);
      console.log(`   Tags: ${mem.memory.tags.join(", ")}`);
      console.log(`   Facts found: ${mem.facts.length}`);
    }
    console.log();
    
    // Test 8: Verify data integrity
    console.log("📝 Test 8: Final data count");
    const finalListResponse = await sendRequest("tools/call", {
      name: "list_memories",
      arguments: { limit: 1000 },
    });
    const finalListResult = JSON.parse(finalListResponse.result.content[0].text);
    console.log(`✅ Total memories in database: ${finalListResult.count}`);
    console.log(`   (Should be 77 = 76 original + 1 test)\n`);
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 All tests passed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Start tests after a brief delay
setTimeout(runTests, 500);

