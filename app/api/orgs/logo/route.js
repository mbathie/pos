import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"
import { getEmployee } from "@/lib/auth"
import { uploadBase64Image, deleteImage } from "@/lib/spaces"

export async function POST(req) {
  await connectDB()

  try {
    const { logo } = await req.json()
    const { employee } = await getEmployee()

    if (!employee || !employee.org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let logoUrl = logo

    // Handle base64 image upload to Spaces
    if (logo && logo.startsWith('data:')) {
      try {
        // Delete old logo if it exists
        if (employee.org.logo) {
          try {
            await deleteImage(employee.org.logo)
          } catch (error) {
            console.error('Error deleting old logo:', error)
          }
        }

        // Upload new logo to Spaces
        const { url } = await uploadBase64Image(
          logo,
          'orgs',
          employee.org._id.toString(),
          `logo-${Date.now()}.jpg`
        )
        logoUrl = url
      } catch (error) {
        console.error('Error uploading logo to Spaces:', error)
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
      }
    }

    const updatedOrg = await Org.findByIdAndUpdate(
      employee.org._id,
      { logo: logoUrl },
      { new: true }
    )

    return NextResponse.json({ logo: updatedOrg.logo }, { status: 200 })
  } catch (error) {
    console.error("Error updating logo:", error)
    return NextResponse.json({ error: "Failed to update logo" }, { status: 500 })
  }
}

export async function DELETE(req) {
  await connectDB()

  try {
    const { employee } = await getEmployee()

    if (!employee || !employee.org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete logo from Spaces if it exists
    if (employee.org.logo) {
      try {
        await deleteImage(employee.org.logo)
      } catch (error) {
        console.error('Error deleting logo from Spaces:', error)
      }
    }

    const updatedOrg = await Org.findByIdAndUpdate(
      employee.org._id,
      { $unset: { logo: "" } },
      { new: true }
    )

    return NextResponse.json({ org: updatedOrg }, { status: 200 })
  } catch (error) {
    console.error("Error removing logo:", error)
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 })
  }
}