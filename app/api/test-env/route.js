import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      HOST: process.env.HOST || 'NOT SET',
      STRIPE_PUB_KEY: process.env.STRIPE_PUB_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'NOT SET',
      NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN || 'NOT SET',
    },
    timestamp: new Date().toISOString()
  })
}