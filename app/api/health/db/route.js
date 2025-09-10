import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"

export async function GET() {
  try {
    await connectDB()
    
    return NextResponse.json({ 
      status: 'ok',
      mongodb: 'connected',
      uri: process.env.MONGODB_URI ? 'configured' : 'missing',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      error: error.message,
      mongodb: 'failed to connect',
      uri: process.env.MONGODB_URI ? 'configured' : 'missing'
    }, { status: 500 })
  }
}