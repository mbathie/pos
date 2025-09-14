#!/usr/bin/env node

/**
 * Database Wipe Script
 * Completely wipes all data from the MongoDB database
 * 
 * Usage:
 *   npm run db:wipe
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos';

/**
 * Wipe the entire database
 */
async function wipeDatabase() {
  console.log('🗑️  Database Wipe Utility');
  console.log('═'.repeat(60));
  console.log(`📍 Database: ${MONGODB_URI}`);
  console.log('');
  
  console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
  console.log('   Press Ctrl+C to cancel...');
  console.log('');
  
  // Give user 3 seconds to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔥 Wiping entire database...');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      console.log(`   Dropping collection: ${collection.name}`);
      await db.dropCollection(collection.name);
    }
    
    console.log('');
    console.log('✅ Database wiped clean');
    console.log('');
    console.log('📝 All collections have been removed');
    console.log('   The database is now completely empty');
    
  } catch (error) {
    console.error('❌ Error wiping database:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  wipeDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { wipeDatabase };