/**
 * Seed Product Modifications
 * Creates mod groups and mods for products
 */

const fs = require('fs');
const path = require('path');
const seedData = require('./seed-data.json');
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

/**
 * Create a mod group (or get existing one)
 */
async function createModGroup(token, name, multiple = false) {
  // First, check if the mod group already exists
  const checkResponse = await fetch(`${API_BASE}/api/modgroups`, {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (checkResponse.ok) {
    const { modGroups } = await checkResponse.json();
    const existing = modGroups.find(g => g.name === name);
    if (existing) {
      console.log(`      Using existing mod group: ${name}`);
      return existing;
    }
  }
  
  // Create new mod group if it doesn't exist
  const response = await fetch(`${API_BASE}/api/modgroups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name,
      multiple
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create mod group ${name}: ${error}`);
  }

  const result = await response.json();
  return result.modGroup || result;
}

/**
 * Create a mod within a group (or get existing one)
 */
async function createMod(token, groupId, mod) {
  // First, check if the mod already exists in this group
  const checkResponse = await fetch(`${API_BASE}/api/modgroups?includeMods=true`, {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (checkResponse.ok) {
    const { modGroups } = await checkResponse.json();
    const group = modGroups.find(g => g._id === groupId);
    if (group && group.mods) {
      const existing = group.mods.find(m => m.name === mod.name);
      if (existing) {
        console.log(`        Using existing mod: ${mod.name}`);
        return existing;
      }
    }
  }
  
  // Create new mod if it doesn't exist
  const response = await fetch(`${API_BASE}/api/mods`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name: mod.name,
      price: mod.amount || 0,  // Map amount to price field
      modGroup: groupId,
      active: true,
      isDefault: mod.isDefault || false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create mod ${mod.name}: ${error}`);
  }

  const result = await response.json();
  return result.mod || result;
}

/**
 * Create all mods from seed data
 */
async function seedMods(token) {
  console.log('  Creating mod groups and mods...');
  
  const modGroups = [];
  const mods = {};
  const modGroupIds = {};
  
  // Create each mod group from seed data
  for (const [key, groupData] of Object.entries(seedData.modGroups)) {
    console.log(`    Creating ${groupData.name} mods...`);
    
    // Create the mod group
    const modGroup = await createModGroup(token, groupData.name, groupData.multiple);
    modGroups.push(modGroup);
    modGroupIds[key] = modGroup._id;
    mods[key] = [];
    
    // Create each mod in the group
    for (const modData of groupData.mods) {
      const mod = await createMod(token, modGroup._id, modData);
      mods[key].push(mod);
    }
  }
  
  console.log(`    Created ${modGroups.length} mod groups`);
  
  return {
    modGroups,
    mods,
    modGroupIds
  };
}

// Export as default test function for the test runner
async function testSeedMods() {
  try {
    // Get the seed config to get the token
    const seedDataFile = require('path').join(__dirname, '.seed-data.json');
    const seedData = require('fs').existsSync(seedDataFile) 
      ? JSON.parse(require('fs').readFileSync(seedDataFile, 'utf8'))
      : null;
    
    if (!seedData || !seedData.token) {
      throw new Error('Seed setup not found. Run test-seed-organization first.');
    }
    
    const result = await seedMods(seedData.token);
    
    // Save mod data to seed data file
    const updatedData = { ...seedData, ...result };
    require('fs').writeFileSync(seedDataFile, JSON.stringify(updatedData, null, 2));
    
    return {
      passed: true,
      details: {
        modGroupsCreated: result.modGroups.length,
        totalMods: Object.values(result.mods).flat().length
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

module.exports = testSeedMods;
module.exports.seedMods = seedMods;
module.exports.createModGroup = createModGroup;
module.exports.createMod = createMod;