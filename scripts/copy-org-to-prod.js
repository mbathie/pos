const mongoose = require('mongoose');

// Configuration
const DEV_URI = 'mongodb://localhost:27017/pos';
const PROD_URI = 'mongodb+srv://doadmin:03a5t74dNzS892PA@cultcha-db-mongodb-syd1-0956ff2f.mongo.ondigitalocean.com/pos?tls=true&authSource=admin';
const ORG_ID = '689f13f0cb0754341e093d78'; // Replace with your org ID

async function copyOrgToProduction() {
  let devConnection, prodConnection;
  
  try {
    // Connect to both databases
    console.log('Connecting to dev database...');
    devConnection = await mongoose.createConnection(DEV_URI);
    
    console.log('Connecting to production database...');
    prodConnection = await mongoose.createConnection(PROD_URI);
    
    // Get the org from dev
    const devOrgs = devConnection.collection('orgs');
    const org = await devOrgs.findOne({ _id: new mongoose.Types.ObjectId(ORG_ID) });
    
    if (!org) {
      console.error('Org not found in dev database!');
      return;
    }
    
    console.log(`Found org: ${org.name}`);
    
    // Copy to production
    const prodOrgs = prodConnection.collection('orgs');
    
    // Check if it already exists
    const existingOrg = await prodOrgs.findOne({ _id: org._id });
    
    if (existingOrg) {
      console.log('Org already exists in production. Updating...');
      await prodOrgs.replaceOne({ _id: org._id }, org);
      console.log('Org updated successfully!');
    } else {
      console.log('Inserting new org to production...');
      await prodOrgs.insertOne(org);
      console.log('Org inserted successfully!');
    }
    
  } catch (error) {
    console.error('Error copying org:', error);
  } finally {
    // Close connections
    if (devConnection) await devConnection.close();
    if (prodConnection) await prodConnection.close();
  }
}

// Run the script
copyOrgToProduction();