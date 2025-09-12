const mongoose = require('mongoose');
const fs = require('fs');

// Configuration
const DEV_URI = 'mongodb://localhost:27017/pos';
const ORG_ID = '689f13f0cb0754341e093d78'; // Replace with your org ID

async function exportOrg() {
  let connection;
  
  try {
    // Connect to dev database
    console.log('Connecting to dev database...');
    connection = await mongoose.createConnection(DEV_URI);
    
    // Get the org
    const orgs = connection.collection('orgs');
    const org = await orgs.findOne({ _id: new mongoose.Types.ObjectId(ORG_ID) });
    
    if (!org) {
      console.error('Org not found!');
      return;
    }
    
    // Save to file
    const filename = `org-${org.name.replace(/[^a-z0-9]/gi, '_')}-${ORG_ID}.json`;
    fs.writeFileSync(filename, JSON.stringify(org, null, 2));
    
    console.log(`Org exported to ${filename}`);
    console.log('You can now import this to production using MongoDB Compass or mongosh');
    
  } catch (error) {
    console.error('Error exporting org:', error);
  } finally {
    if (connection) await connection.close();
  }
}

// Run the script
exportOrg();