#!/usr/bin/env node

/**
 * Test: Mod Creation
 * 
 * Validates that product modifications can be created and applied to products
 */

const {
  getTestConfig,
  apiCall,
  formatTestResult,
  runTest
} = require('./test-utils');
const { createModGroup, createMod } = require('./test-seed-mods');

async function testModCreation() {
  const config = getTestConfig();
  const token = config.token;
  
  // Step 1: Create a test mod group
  console.log('📝 Creating test mod group...');
  const modGroup = await createModGroup(token, 'TEST-Size', false);
  console.log(`   Created mod group: ${modGroup.name} (ID: ${modGroup._id})`);
  
  // Step 2: Create mods in the group
  console.log('🎨 Creating mods...');
  const mods = [];
  
  const testMods = [
    { name: 'Small', amount: 0 },
    { name: 'Medium', amount: 0.50 },
    { name: 'Large', amount: 1.00 }
  ];
  
  for (const modData of testMods) {
    const mod = await createMod(token, modGroup._id, modData);
    mods.push(mod);
    console.log(`   Created mod: ${mod.name} (+$${mod.price || 0})`);
  }
  
  // Step 3: Verify mods were created
  console.log('\n✅ Verifying mod creation...');
  const response = await apiCall('/api/modgroups');
  const modGroups = response.modGroups || response;
  const foundGroup = modGroups.find(g => g._id === modGroup._id);
  
  const passed = foundGroup && 
                 foundGroup.name === 'TEST-Size' &&
                 mods.length === 3;
  
  // Clean up test mods
  console.log('\n🧹 Cleaning up test mods...');
  try {
    // Delete each mod
    for (const mod of mods) {
      await apiCall(`/api/mods/${mod._id}`, { method: 'DELETE' });
    }
    // Delete the mod group
    await apiCall(`/api/modgroups/${modGroup._id}`, { method: 'DELETE' });
    console.log('   Test mods cleaned up');
  } catch (error) {
    console.log('   Warning: Could not clean up test mods:', error.message);
  }
  
  return formatTestResult('Mod Creation', passed, {
    modGroupId: modGroup._id,
    modGroupName: modGroup.name,
    modsCreated: mods.length,
    modNames: mods.map(m => m.name)
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Mod Creation', testModCreation)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testModCreation;