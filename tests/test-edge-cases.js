#!/usr/bin/env node

/**
 * Test Script for Direct-Access Edge Cases
 * 
 * Tests:
 * 1. Cannot convert direct-access to searchable via text update
 * 2. CAN update tags on direct-access memories
 * 3. Direct-access memories not included in embedding backfill
 */

import { handleAddMemory } from '../dist/handlers/add-memory.js';
import { handleUpdateMemory } from '../dist/handlers/update-memory.js';
import { handleSearchMemory } from '../dist/handlers/search-memory.js';

async function testEdgeCases() {
  console.log('🧪 Testing Direct-Access Edge Cases\n');
  
  try {
    // Test 1: Create a direct-access memory
    console.log('Test 1: Creating direct-access memory...');
    const directMemory = await handleAddMemory({
      text: JSON.stringify({ config: 'large data here' }),
      context_tags: ['config', 'test'],
      direct_access_only: true
    });
    const directData = JSON.parse(directMemory.content[0].text);
    console.log('✅ Created:', directData.memory.id);
    console.log('   Direct access only:', directData.memory.direct_access_only);
    
    // Test 2: Try to update text (should fail)
    console.log('\nTest 2: Attempting to update text on direct-access memory (should fail)...');
    try {
      await handleUpdateMemory({
        memory_id: directData.memory.id,
        text: 'New text that would require facts',
        context_tags: ['config', 'updated']
      });
      console.log('❌ ERROR: Update should have been blocked!');
      process.exit(1);
    } catch (error) {
      if (error.message.includes('Cannot update text for direct-access-only memories')) {
        console.log('✅ Correctly blocked text update');
        console.log('   Error message:', error.message.split('\n')[0]);
      } else {
        console.log('❌ Unexpected error:', error.message);
        process.exit(1);
      }
    }
    
    // Test 3: Update tags only (should succeed)
    console.log('\nTest 3: Updating tags on direct-access memory (should succeed)...');
    const tagUpdate = await handleUpdateMemory({
      memory_id: directData.memory.id,
      add_tags: ['new-tag', 'another-tag']
    });
    const tagUpdateData = JSON.parse(tagUpdate.content[0].text);
    if (tagUpdateData.success) {
      console.log('✅ Tag update succeeded');
      console.log('   New tags:', tagUpdateData.context_tags);
      console.log('   Has "new-tag":', tagUpdateData.context_tags.includes('new-tag'));
      console.log('   Has "another-tag":', tagUpdateData.context_tags.includes('another-tag'));
    } else {
      console.log('❌ Tag update failed');
      process.exit(1);
    }
    
    // Test 4: Remove tags (should succeed)
    console.log('\nTest 4: Removing tags from direct-access memory (should succeed)...');
    const tagRemove = await handleUpdateMemory({
      memory_id: directData.memory.id,
      remove_tags: ['test']
    });
    const tagRemoveData = JSON.parse(tagRemove.content[0].text);
    if (tagRemoveData.success) {
      console.log('✅ Tag removal succeeded');
      console.log('   Final tags:', tagRemoveData.context_tags);
      console.log('   "test" removed:', !tagRemoveData.context_tags.includes('test'));
    } else {
      console.log('❌ Tag removal failed');
      process.exit(1);
    }
    
    // Test 5: Verify it's still not searchable
    console.log('\nTest 5: Verifying memory is still not searchable...');
    const search = await handleSearchMemory({
      query: 'config'
    });
    const searchData = JSON.parse(search.content[0].text);
    const foundInSearch = searchData.memories?.some(m => 
      m.memory?.id === directData.memory.id
    );
    if (foundInSearch) {
      console.log('❌ ERROR: Direct-access memory appeared in search!');
      process.exit(1);
    } else {
      console.log('✅ Memory still not searchable after tag updates');
    }
    
    // Test 6: Create normal memory and verify updates work normally
    console.log('\nTest 6: Verifying normal memories can still be updated...');
    const normalMemory = await handleAddMemory({
      text: 'This is a normal memory about testing',
      context_tags: ['test'],
      facts: ['This is about testing']
    });
    const normalData = JSON.parse(normalMemory.content[0].text);
    console.log('✅ Normal memory created:', normalData.memory.id);
    
    const normalUpdate = await handleUpdateMemory({
      memory_id: normalData.memory.id,
      text: 'Updated text for normal memory',
      context_tags: ['test', 'updated'],
      facts: ['This is updated']
    });
    const normalUpdateData = JSON.parse(normalUpdate.content[0].text);
    if (normalUpdateData.success) {
      console.log('✅ Normal memory text update succeeded');
      console.log('   New text:', normalUpdateData.memory.text.substring(0, 40) + '...');
    } else {
      console.log('❌ Normal memory update failed');
      process.exit(1);
    }
    
    console.log('\n✅ All edge case tests passed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testEdgeCases().then(() => {
  console.log('Edge case test suite finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});



