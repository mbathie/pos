#!/usr/bin/env node

/**
 * Database Seeding Script
 * Runs seed tests to populate the database with initial data
 * 
 * Usage:
 *   npm run seed              # Seed database
 *   npm run seed --format     # Wipe database first, then seed
 */

const mongoose = require('mongoose');
const { runAllTests } = require('./run-tests');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos';

/**
 * Wipe entire database
 */
async function wipeDatabase() {
  console.log('🗑️  Wiping entire database...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      console.log(`   Dropping collection: ${collection.collectionName}`);
      await collection.drop();
    }
    
    console.log('✅ Database wiped clean');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Failed to wipe database:', error.message);
    throw error;
  }
}

/**
 * Run seed tests in order
 */
async function seed(shouldFormat = false) {
  console.log('🌱 Database Seeding');
  console.log('═'.repeat(60));
  
  // Check if server is running
  try {
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
    await fetch('http://localhost:3000/api/health');
  } catch (error) {
    console.error('❌ Server is not running. Please start the dev server first.');
    console.log('   Run: npm run dev --turbopack');
    process.exit(1);
  }
  
  // Wipe database if --format flag is provided
  if (shouldFormat) {
    await wipeDatabase();
    console.log('');
  }
  
  // Discover seed tests directly
  const testDir = path.join(__dirname, 'tests');
  const seedFiles = fs.readdirSync(testDir)
    .filter(file => file.startsWith('test-seed-') && file.endsWith('.js'))
    .map(file => ({
      name: file.replace('test-', '').replace('.js', '').replace(/-/g, ' '),
      path: path.join(testDir, file),
      category: 'Database Seeding'
    }));
  
  const seedTests = seedFiles;
  
  // Define the order for seed tests
  const seedOrder = [
    'seed organization', 
    'seed mods',
    'seed products'
  ];
  
  // Sort seed tests by defined order
  seedTests.sort((a, b) => {
    const aIndex = seedOrder.findIndex(order => a.name.includes(order));
    const bIndex = seedOrder.findIndex(order => b.name.includes(order));
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  if (seedTests.length === 0) {
    console.error('❌ No seed tests found');
    process.exit(1);
  }
  
  console.log(`Running ${seedTests.length} seed tests`);
  console.log('');
  
  // Run the seed tests (without cleanup)
  const results = await runAllTests(seedTests, false);
  
  if (results.failed > 0) {
    console.error('\n❌ Seeding failed');
    process.exit(1);
  }
  
  // Load the saved seed data to display credentials
  try {
    const fs = require('fs');
    const path = require('path');
    const seedDataFile = path.join(__dirname, 'tests', '.seed-data.json');
    
    if (fs.existsSync(seedDataFile)) {
      const seedData = JSON.parse(fs.readFileSync(seedDataFile, 'utf8'));
      
      console.log('\n' + '═'.repeat(60));
      console.log('🎉 Database seeding complete!');
      console.log('');
      console.log('Login credentials:');
      console.log(`  Email: ${seedData.email || 'mbathie@gmail.com'}`);
      console.log(`  Password: ${seedData.password || 'test'}`);
      console.log('');
    }
  } catch (error) {
    // Ignore errors reading seed data file
  }
  
  return results;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldFormat = args.includes('--format');
  
  if (shouldFormat) {
    console.log('⚠️  WARNING: --format flag detected');
    console.log('   This will DELETE ALL DATA in the database!');
    console.log('');
  }
  
  seed(shouldFormat)
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seed, wipeDatabase };