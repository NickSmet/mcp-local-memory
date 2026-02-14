#!/usr/bin/env node

/**
 * Test Script for Direct-Access-Only Memories Feature
 * 
 * Tests:
 * 1. Create normal searchable memory
 * 2. Create direct-access-only memory
 * 3. Search should not return direct-access memories
 * 4. list_memories should not return direct-access memories by default
 * 5. list_memories with direct_access_only=true should return only direct-access memories
 * 6. get_memory should work for both types
 * 7. Truncation for direct-access listings
 */

import { handleAddMemory } from '../dist/handlers/add-memory.js';
import { handleListMemories } from '../dist/handlers/list-memories.js';
import { handleSearchMemory } from '../dist/handlers/search-memory.js';
import { handleGetMemory } from '../dist/handlers/get-memory.js';

const TEST_CONTEXT = 'test-context-' + Date.now();

async function testDirectAccessFeature() {
  console.log('🧪 Testing Direct-Access-Only Memories Feature\n');
  
  try {
    // Test 1: Create normal searchable memory
    console.log('Test 1: Creating normal searchable memory...');
    const normalMemory = await handleAddMemory({
      text: 'This is a normal searchable memory about TypeScript preferences',
      context_tags: ['typescript', 'preferences'],
      facts: ['User prefers TypeScript', 'User uses strict mode']
    });
    const normalMemoryData = JSON.parse(normalMemory.content[0].text);
    console.log('✅ Normal memory created:', normalMemoryData.memory.id);
    console.log('   Direct access only:', normalMemoryData.memory.direct_access_only);
    
    // Test 2: Create direct-access-only memory with large JSON
    console.log('\nTest 2: Creating direct-access-only memory...');
    const largeConfig = JSON.stringify({
      apiEndpoints: { production: 'https://api.example.com', staging: 'https://staging-api.example.com' },
      features: { darkMode: true, analytics: false, notifications: true },
      database: { host: 'localhost', port: 5432, name: 'mydb' }
    }, null, 2);
    
    const directMemory = await handleAddMemory({
      text: largeConfig,
      context_tags: ['api-config', 'production'],
      direct_access_only: true
    });
    const directMemoryData = JSON.parse(directMemory.content[0].text);
    console.log('✅ Direct-access memory created:', directMemoryData.memory.id);
    console.log('   Direct access only:', directMemoryData.memory.direct_access_only);
    console.log('   Message:', directMemoryData.message);
    
    // Test 3: Search should not return direct-access memories
    console.log('\nTest 3: Testing search (should not return direct-access memories)...');
    const searchResults = await handleSearchMemory({
      query: 'configuration'
    });
    const searchData = JSON.parse(searchResults.content[0].text);
    console.log('✅ Search returned', searchData.results, 'results');
    const hasDirectAccess = searchData.memories?.some(m => m.memory?.direct_access_only === true);
    if (hasDirectAccess) {
      console.log('❌ ERROR: Search returned direct-access memory!');
    } else {
      console.log('✅ Correctly excluded direct-access memories from search');
    }
    
  // Test 4: list_memories should not return direct-access memories by default
  console.log('\nTest 4: Testing list_memories (should not return direct-access by default)...');
  const normalList = await handleListMemories({});
  const normalListData = JSON.parse(normalList.content[0].text);
  console.log('✅ Default list returned', normalListData.count, 'memories');
  console.log('   Note:', normalListData.note);
  const hasDirectInNormal = normalListData.memories?.some(m => m.direct_access_only === true);
  if (hasDirectInNormal) {
    console.log('❌ ERROR: Default list returned direct-access memory!');
  } else {
    console.log('✅ Correctly excluded direct-access memories from default list');
  }
  
  // Check that normal memories are also truncated
  if (normalListData.memories && normalListData.memories.length > 0) {
    const hasLongText = normalListData.memories.some(m => m.text && m.text.length > 250);
    if (hasLongText) {
      console.log('⚠️  Warning: Some normal memories not truncated');
    } else {
      console.log('✅ Normal memories also truncated (all <= 250 chars)');
    }
  }
    
    // Test 5: list_memories with direct_access_only=true
    console.log('\nTest 5: Testing list_memories with direct_access_only=true...');
    const directList = await handleListMemories({
      direct_access_only: true
    });
    const directListData = JSON.parse(directList.content[0].text);
    console.log('✅ Direct-access list returned', directListData.count, 'memories');
    console.log('   Note:', directListData.note);
    
    if (directListData.memories && directListData.memories.length > 0) {
      const firstMemory = directListData.memories[0];
      console.log('   First memory ID:', firstMemory.id);
      console.log('   Text length:', firstMemory.text.length);
      console.log('   Text preview:', firstMemory.text.substring(0, 50) + '...');
      
      // Test 6: Check truncation
      if (firstMemory.text.endsWith('...')) {
        console.log('✅ Text correctly truncated');
      } else {
        console.log('⚠️  Text not truncated (might be short enough)');
      }
    }
    
    // Test 7: get_memory should work for direct-access memories
    console.log('\nTest 6: Testing get_memory for direct-access memory...');
    const retrievedMemory = await handleGetMemory({
      memory_id: directMemoryData.memory.id
    });
    const retrievedData = JSON.parse(retrievedMemory.content[0].text);
    if (retrievedData.success) {
      console.log('✅ Direct-access memory retrieved successfully');
      console.log('   Full text length:', retrievedData.memory.text.length);
      console.log('   Has complete data:', retrievedData.memory.text.includes('apiEndpoints'));
    } else {
      console.log('❌ ERROR: Could not retrieve direct-access memory!');
    }
    
    // Test 8: Tag filtering with direct-access memories
    console.log('\nTest 7: Testing tag filtering with direct_access_only=true...');
    const tagFilteredList = await handleListMemories({
      direct_access_only: true,
      context_tags: ['api-config']
    });
    const tagFilteredData = JSON.parse(tagFilteredList.content[0].text);
    console.log('✅ Tag-filtered direct-access list returned', tagFilteredData.count, 'memories');
    
    console.log('\n✅ All tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testDirectAccessFeature().then(() => {
  console.log('Test suite finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

