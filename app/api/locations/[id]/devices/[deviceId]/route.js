import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location } from "@/models";
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

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Remove the device
    location.devices = location.devices.filter(
      d => d._id.toString() !== deviceId
    );

    await location.save();

    return NextResponse.json({
      success: true,
      message: "Device removed"
    });

  } catch (error) {
    console.error('Error removing device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
