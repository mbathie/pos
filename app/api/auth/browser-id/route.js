import { NextResponse } from 'next/server'
import { getBrowserId } from '@/lib/cookies'

export async function GET() {
  try {
    const browserId = await getBrowserId()

    if (!browserId) {
      return NextResponse.json({ browserId: null }, { status: 200 })
    }

    return NextResponse.json({ browserId }, { status: 200 })
  } catch (error) {
    console.error('Error getting browser ID:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
