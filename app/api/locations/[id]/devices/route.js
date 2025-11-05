import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location, Terminal } from "@/models";
import { getEmployee } from "@/lib/auth";

// GET all devices for a location
export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    }).populate('devices.terminal');

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({
      devices: location.devices || []
    });

  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST - Register or update a device
export async function POST(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { browserId, name, metadata } = body;

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!browserId) {
      return NextResponse.json({ error: "browserId is required" }, { status: 400 });
    }

    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Check if device already exists
    const existingDeviceIndex = location.devices.findIndex(
      d => d.browserId === browserId
    );

    if (existingDeviceIndex >= 0) {
      // Update existing device
      location.devices[existingDeviceIndex].name = name || location.devices[existingDeviceIndex].name;
      location.devices[existingDeviceIndex].lastSeen = new Date();
      location.devices[existingDeviceIndex].metadata = metadata || location.devices[existingDeviceIndex].metadata;
    } else {
      // Add new device
      location.devices.push({
        browserId,
        name: name || `Device ${location.devices.length + 1}`,
        lastSeen: new Date(),
        metadata
      });
    }

    await location.save();

    return NextResponse.json({
      success: true,
      message: existingDeviceIndex >= 0 ? "Device updated" : "Device registered",
      devices: location.devices
    });

  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
