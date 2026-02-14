#!/usr/bin/env node
/**
 * Test the SSE interface of MCP Local Memory server
 */

const http = require('http');

const SSE_ENDPOINT = 'http://localhost:3133/sse';
const TEST_USER_ID = process.env.USER_ID || 'default';

async function sendMessage(endpoint, message) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    
    const postData = JSON.stringify(message);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: '/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testSSE() {
  console.log('🧪 Testing MCP Local Memory SSE Interface\n');
  console.log('Endpoint:', SSE_ENDPOINT);
  console.log('User ID:', TEST_USER_ID);
  console.log('=' .repeat(60) + '\n');

  try {
    // Test 1: List memories
    console.log('1️⃣ Testing list_memories...');
    const listRequest = {
      method: 'tools/call',
      params: {
        name: 'list_memories',
        arguments: {
          limit: 5
        }
      }
    };
    
    const listResult = await sendMessage(SSE_ENDPOINT, listRequest);
    console.log('✅ List result:', JSON.stringify(listResult, null, 2).slice(0, 200));
    console.log();

    // Test 2: Get tags
    console.log('2️⃣ Testing get_context_tags...');
    const tagsRequest = {
      method: 'tools/call',
      params: {
        name: 'get_context_tags',
        arguments: {}
      }
    };
    
    const tagsResult = await sendMessage(SSE_ENDPOINT, tagsRequest);
    console.log('✅ Tags result:', JSON.stringify(tagsResult, null, 2).slice(0, 200));
    console.log();

    // Test 3: Search
    console.log('3️⃣ Testing search_memory...');
    const searchRequest = {
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'configuration',
          limit: 3
        }
      }
    };
    
    const searchResult = await sendMessage(SSE_ENDPOINT, searchRequest);
    console.log('✅ Search result:', JSON.stringify(searchResult, null, 2).slice(0, 300));
    console.log();

    console.log('🎉 All SSE tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSSE();

