import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"
import mongoose from "mongoose"
import { uploadBase64Image, deleteImage } from "@/lib/spaces"

export async function GET(req, { params }) {
  await connectDB()
  const { employee } = await getEmployee()
  const { id } = await params
  const orgId = employee.org._id

  try {
    const customer = await Customer.findOne({
      _id: id,
      orgs: orgId, // Ensure customer belongs to this org
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  await connectDB()
  const { employee } = await getEmployee()
  const { id } = await params
  const orgId = employee.org._id
  const updates = await req.json()

  // Get existing customer first to check for old photo
  const existingCustomer = await Customer.findOne({
    _id: id,
    orgs: orgId,
  })

  if (!existingCustomer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  // Handle photo upload if new photo is provided
  if (updates.photo && updates.photo.startsWith('data:')) {
    try {
      // Delete old photo from Spaces if it exists and is a Spaces URL
      if (existingCustomer.photo && existingCustomer.photo.includes('digitaloceanspaces.com')) {
        try {
          await deleteImage(existingCustomer.photo)
        } catch (error) {
          console.error('Error deleting old photo:', error)
        }
      }

      // Upload new photo to Spaces
      const { url } = await uploadBase64Image(
        updates.photo,
        'customers',
        id,
        `customer-${Date.now()}.jpg`
      )

      // Replace base64 with the Spaces URL
      updates.photo = url
    } catch (error) {
      console.error('Error uploading photo to Spaces:', error)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }
  } else if (updates.photo === null || updates.photo === '') {
    // If photo is being removed, delete from Spaces
    if (existingCustomer.photo && existingCustomer.photo.includes('digitaloceanspaces.com')) {
      try {
        await deleteImage(existingCustomer.photo)
      } catch (error) {
        console.error('Error deleting photo:', error)
      }
    }
    updates.photo = null
  }

  // If dependents are being updated, ensure they have ObjectIds
  if (updates.dependents && Array.isArray(updates.dependents)) {
    updates.dependents = updates.dependents.map(dep => ({
      ...dep,
      _id: dep._id ? new mongoose.Types.ObjectId(dep._id) : new mongoose.Types.ObjectId()
    }))
  }

  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: id,
        orgs: orgId, // Ensure customer belongs to this org
      },
      updates,
      { new: true, runValidators: true }
    )

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  await connectDB()
  const { employee } = await getEmployee()
  const { id } = await params
  const orgId = employee.org._id

  try {
    const customer = await Customer.findOneAndDelete({
      _id: id,
      orgs: orgId, // Ensure customer belongs to this org
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}