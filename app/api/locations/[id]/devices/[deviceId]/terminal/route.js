import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location, Terminal } from "@/models";
import { getEmployee } from "@/lib/auth";

// PUT - Link a terminal to a device
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id, deviceId } = await params;
    const body = await req.json();
    const { terminalId } = body;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const device = location.devices.id(deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Verify terminal exists and belongs to this location
    if (terminalId) {
      const terminal = await Terminal.findOne({
        _id: terminalId,
        location: id,
        org: employee.org._id
      });

      if (!terminal) {
        return NextResponse.json({
          error: "Terminal not found or doesn't belong to this location"
        }, { status: 404 });
      }

      // Check if terminal is already linked to another device
      const alreadyLinked = location.devices.find(
        d => d._id.toString() !== deviceId &&
             d.terminal &&
             d.terminal.toString() === terminalId
      );

      if (alreadyLinked) {
        return NextResponse.json({
          error: "Terminal is already linked to another device"
        }, { status: 400 });
      }

      device.terminal = terminalId;
    } else {
      // Unlink terminal
      device.terminal = null;
    }

    device.lastSeen = new Date();
    await location.save();

    // Populate terminal for response
    await location.populate('devices.terminal');
    const updatedDevice = location.devices.id(deviceId);

    return NextResponse.json({
      success: true,
      message: terminalId ? "Terminal linked to device" : "Terminal unlinked from device",
      device: updatedDevice
    });

  } catch (error) {
    console.error('Error linking terminal to device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Unlink terminal from device
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id, deviceId } = await params;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const device = location.devices.id(deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    device.terminal = null;
    device.lastSeen = new Date();
    await location.save();

    return NextResponse.json({
      success: true,
      message: "Terminal unlinked from device"
    });

  } catch (error) {
    console.error('Error unlinking terminal from device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
