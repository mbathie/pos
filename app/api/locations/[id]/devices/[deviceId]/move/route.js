import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Location } from '@/models'
import { getEmployee } from '@/lib/auth'

export async function POST(req, { params }) {
  try {
    await connectDB()

    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, deviceId } = await params
    const { targetLocationId } = await req.json()

    if (!targetLocationId) {
      return NextResponse.json({ error: 'Target location ID is required' }, { status: 400 })
    }

    // Get source location
    const sourceLocation = await Location.findOne({
      _id: id,
      org: employee.org._id
    })

    if (!sourceLocation) {
      return NextResponse.json({ error: 'Source location not found' }, { status: 404 })
    }

    // Get target location
    const targetLocation = await Location.findOne({
      _id: targetLocationId,
      org: employee.org._id
    })

    if (!targetLocation) {
      return NextResponse.json({ error: 'Target location not found' }, { status: 404 })
    }

    // Find the device in the source location
    const device = sourceLocation.devices.id(deviceId)
    if (!device) {
      return NextResponse.json({ error: 'Device not found in source location' }, { status: 404 })
    }

    // Check if device already exists in target location
    const deviceExistsInTarget = targetLocation.devices.find(
      d => d.browserId === device.browserId
    )

    if (deviceExistsInTarget) {
      return NextResponse.json({
        error: 'Device already exists in target location'
      }, { status: 400 })
    }

    // Create a plain object copy of the device
    const deviceCopy = {
      browserId: device.browserId,
      name: device.name,
      terminal: device.terminal,
      lastSeen: device.lastSeen,
      metadata: device.metadata
    }

    // Add device to target location
    targetLocation.devices.push(deviceCopy)
    await targetLocation.save()

    // Remove device from source location (use pull instead of remove)
    sourceLocation.devices.pull({ _id: deviceId })
    await sourceLocation.save()

    return NextResponse.json({
      message: 'Device moved successfully',
      device: deviceCopy
    })
  } catch (error) {
    console.error('Error moving device:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
