import { NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from "@/lib/mongoose"
import { Location } from "@/models"

export async function GET(req, { params }) {
  await connectDB()

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 })
  }

  const location = await Location.findById(params.id).select('-orgId').lean()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  location.phone = location.phone || ''
  location.address1 = location.address1 || ''
  location.city = location.city || ''
  location.state = location.state || ''
  location.postcode = location.postcode || ''
  location.storeHours = location.storeHours?.length === 7
    ? location.storeHours
    : Array.from({ length: 7 }, (_, d) => ({
        d,
        open: '',
        close: '',
        ...(location.storeHours?.find(h => h.d === d) || {})
      }))

  return NextResponse.json(location)
}

export async function PUT(req, { params }) {
  await connectDB()

  const updates = await req.json()
  const updated = await Location.findByIdAndUpdate(params.id, updates, { new: true }).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}