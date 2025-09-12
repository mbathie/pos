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
    // Extract database name from URI or default to 'pos'
    const dbName = MONGODB_URI.includes('/pos') ? 'pos' : 
                   MONGODB_URI.match(/\/([^/?]+)(\?|$)/)?.[1] || 'pos';
    
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      dbName: dbName, // Explicitly set the database name
    }).then((mongoose) => {
      console.log(`Connected to MongoDB database: ${dbName}`);
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export { connectDB };