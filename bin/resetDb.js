// scripts/clearDatabase.js (CommonJS)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env or .env.development (priority to .env.development if it exists)
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in .env files');
  process.exit(1);
}

async function clearDatabase() {
  try {
    await mongoose.connect(uri);
    const dbName = mongoose.connection.name;
    await mongoose.connection.dropDatabase();
    console.log(`✅ Database "${dbName}" dropped successfully.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Failed to clear database:', err);
    process.exit(1);
  }
}

clearDatabase();