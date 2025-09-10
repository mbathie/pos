import { NextResponse } from "next/server"

export async function GET() {
  const envVars = {
    MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    HOST: process.env.HOST || 'NOT SET',
    // Don't log actual values for security
    MONGODB_URI_LENGTH: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
  }
  
  try {
    // Try to import and use connectDB
    const { connectDB } = await import('@/lib/mongoose')
    await connectDB()
    
    return NextResponse.json({ 
      status: 'ok',
      mongodb: 'connected',
      envVars,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      error: error.message,
      mongodb: 'failed to connect',
      envVars,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}