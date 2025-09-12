// lib/mongoose.js
import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    // Always use 'pos' database regardless of what's in the URI
    // This ensures we don't accidentally use 'admin' even with authSource=admin
    const dbName = 'pos';
    
    // Replace any database name in the URI with 'pos'
    let connectionUri = MONGODB_URI;
    if (connectionUri.includes('ondigitalocean.com/')) {
      // Replace the database part after the host
      connectionUri = connectionUri.replace(/ondigitalocean\.com\/[^?]*/, 'ondigitalocean.com/pos');
    }
    
    cached.promise = mongoose.connect(connectionUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      dbName: dbName, // Explicitly force 'pos' database
    }).then((mongoose) => {
      console.log(`Connected to MongoDB database: ${dbName} (forced)`);
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export { connectDB };