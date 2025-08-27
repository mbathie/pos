import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"
import mongoose from "mongoose"

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