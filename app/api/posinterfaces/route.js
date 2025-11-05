import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface } from '@/models';

// GET /api/posinterfaces - List all POS interfaces for the org
export async function GET(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can access POS interfaces
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    await connectDB();

    const interfaces = await POSInterface.find({ org: employee.org._id })
      .populate('locations', 'name')
      .populate('devices.locationId', 'name devices')
      .sort({ isDefault: -1, name: 1 });

    // Enrich interfaces with device information
    const enrichedInterfaces = interfaces.map(iface => {
      const ifaceObj = iface.toObject();

      // Collect device names from the populated locations
      const deviceNames = [];
      if (ifaceObj.devices) {
        for (const device of ifaceObj.devices) {
          if (device.locationId && device.locationId.devices) {
            const locationDevice = device.locationId.devices.find(d => d.browserId === device.browserId);
            if (locationDevice && locationDevice.name) {
              deviceNames.push(locationDevice.name);
            }
          }
        }
      }

      return {
        ...ifaceObj,
        deviceCount: ifaceObj.devices?.length || 0,
        deviceNames
      };
    });

    return NextResponse.json({ interfaces: enrichedInterfaces });
  } catch (error) {
    console.error('Error fetching POS interfaces:', error);
    return NextResponse.json({ error: 'Failed to fetch POS interfaces' }, { status: 500 });
  }
}

// POST /api/posinterfaces - Create a new POS interface
export async function POST(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can create POS interfaces
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, locations = [], isDefault = false } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If this is being set as default, unset any existing default
    if (isDefault) {
      await POSInterface.updateMany(
        { org: employee.org._id, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const posInterface = await POSInterface.create({
      name,
      org: employee.org._id,
      locations,
      categories: [],
      isDefault
    });

    return NextResponse.json({ interface: posInterface }, { status: 201 });
  } catch (error) {
    console.error('Error creating POS interface:', error);
    return NextResponse.json({ error: 'Failed to create POS interface' }, { status: 500 });
  }
}
