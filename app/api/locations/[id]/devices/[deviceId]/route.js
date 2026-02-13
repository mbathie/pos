import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location, POSInterface } from "@/models";
import { getEmployee } from "@/lib/auth";

// PUT - Update device (e.g., rename)
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id, deviceId } = await params;
    const body = await req.json();
    const { name } = body;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and manager can update device settings
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Find device by _id or browserId
    const device = location.devices.find(
      d => d._id.toString() === deviceId || d.browserId === deviceId
    );
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (name) device.name = name;
    device.lastSeen = new Date();

    await location.save();

    return NextResponse.json({
      success: true,
      message: "Device updated",
      device
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove a device
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id, deviceId } = await params;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and manager can remove devices
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Find the device to get its browserId (in case deviceId is _id)
    const deviceToRemove = location.devices.find(
      d => d._id.toString() === deviceId || d.browserId === deviceId
    );

    const browserIdToRemove = deviceToRemove?.browserId;

    // Remove the device (deviceId can be either _id or browserId)
    location.devices = location.devices.filter(
      d => d._id.toString() !== deviceId && d.browserId !== deviceId
    );

    await location.save();

    // Also remove this device from any POS interfaces
    if (browserIdToRemove) {
      await POSInterface.updateMany(
        { org: employee.org._id },
        { $pull: { devices: { browserId: browserIdToRemove } } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Device removed"
    });

  } catch (error) {
    console.error('Error removing device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
