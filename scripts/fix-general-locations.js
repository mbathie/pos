#!/usr/bin/env node

/**
 * Script to update general entries that were created with the wrong location
 * This will update all general entries from one location to another
 */

const { connectDB } = require("../lib/mongoose");
const { General } = require("../models");

async function fixGeneralLocations() {
  try {
    await connectDB();
    
    // Configuration - update these IDs as needed
    const OLD_LOCATION_ID = '68a28bc368204fa0fbdc4c66'; // 2nd location
    const NEW_LOCATION_ID = '689f13f1cb0754341e093d90'; // Default location
    const ORG_ID = '689f13f0cb0754341e093d78'; // Your org
    
    console.log('🔄 Fixing general entry locations...');
    console.log(`  From location: ${OLD_LOCATION_ID}`);
    console.log(`  To location: ${NEW_LOCATION_ID}`);
    console.log(`  For org: ${ORG_ID}`);
    
    // Find all general entries with the old location
    const result = await General.updateMany(
      { 
        org: ORG_ID,
        location: OLD_LOCATION_ID 
      },
      { 
        $set: { location: NEW_LOCATION_ID } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} general entries`);
    
    // Verify the update
    const updatedCount = await General.countDocuments({
      org: ORG_ID,
      location: NEW_LOCATION_ID
    });
    
    console.log(`📊 Total general entries with correct location: ${updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixGeneralLocations();