import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface, Location } from '@/models';

// POST /api/devices/update-pos-interface - Update POS interface for a specific device
export async function POST(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can update device settings
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { browserId, posInterfaceId, locationId } = body;

    if (!browserId || !locationId) {
      return NextResponse.json({ error: 'Browser ID and Location ID are required' }, { status: 400 });
    }

    // Verify the location belongs to this org
    const location = await Location.findOne({
      _id: locationId,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Verify the device exists at this location
    const deviceExists = location.devices?.some(d => d.browserId === browserId);
    if (!deviceExists) {
      return NextResponse.json({ error: 'Device not found at this location' }, { status: 404 });
    }

    // Remove this device from all POS interfaces
    await POSInterface.updateMany(
      { org: employee.org._id },
      { $pull: { devices: { browserId } } }
    );

    // If a new POS interface is specified, add the device to it
    if (posInterfaceId) {
      // Verify the POS interface belongs to this org
      const posInterface = await POSInterface.findOne({
        _id: posInterfaceId,
        org: employee.org._id
      });

      if (!posInterface) {
        return NextResponse.json({ error: 'POS interface not found' }, { status: 404 });
      }

      // Add device to the POS interface
      await POSInterface.findByIdAndUpdate(posInterfaceId, {
        $push: {
          devices: {
            locationId,
            browserId
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device POS interface:', error);
    return NextResponse.json({ error: 'Failed to update POS interface' }, { status: 500 });
  }
}
