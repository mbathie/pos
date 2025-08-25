import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { General } from "@/models"

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const orgId = employee.org._id

  console.log('🔍 Fetching generals with:', {
    org: orgId,
    location: employee.selectedLocationId
  })

  const generals = await General.find({ org: orgId, location: employee.selectedLocationId })
    .populate("customer")
    .populate("product")
    .populate("location")
    .populate("transaction")
    .sort({ start: -1 })

  console.log(`📊 Found ${generals.length} general entries`)
  
  // Also check if there are any generals at all for this org
  const allOrgGenerals = await General.find({ org: orgId })
  console.log(`📊 Total generals for org: ${allOrgGenerals.length}`)
  if (allOrgGenerals.length > 0) {
    console.log('Locations in generals:', allOrgGenerals.map(g => g.location))
  }

  return NextResponse.json(generals)
}
