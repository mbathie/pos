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
    const db = mongoose.connection;

    const collectionArg = process.argv[2];
    if (collectionArg) {
      const collections = await db.db.listCollections().toArray();
      const names = collections.map(c => c.name);
      if (names.includes(collectionArg)) {
        await db.dropCollection(collectionArg);
        console.log(`✅ Collection "${collectionArg}" dropped successfully.`);
      } else {
        console.warn(`⚠️ Collection "${collectionArg}" does not exist.`);
      }
    } else {
      const dbName = db.name;
      await db.dropDatabase();
      console.log(`✅ Database "${dbName}" dropped successfully.`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Failed to clear database:', err);
    process.exit(1);
  }
}

clearDatabase();