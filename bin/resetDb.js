// scripts/clearDatabase.js (CommonJS)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Determine environment file
let envFile;
if (process.argv.includes('--production')) {
  envFile = path.resolve(__dirname, '../.env.production');
} else {
  envFile = path.resolve(__dirname, '../.env.development');
}

// Load environment variables (priority to the chosen env file, then fallback to .env)
dotenv.config({ path: envFile });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment files');
  process.exit(1);
}

async function clearDatabase() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection;

    const collectionArgIndex = process.argv.findIndex(arg => !arg.startsWith('--') && arg !== process.argv[1] && arg !== process.argv[0]);
    const collectionArg = collectionArgIndex !== -1 ? process.argv[collectionArgIndex] : null;

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