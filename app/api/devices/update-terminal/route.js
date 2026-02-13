import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Location } from '@/models';

// POST /api/devices/update-terminal - Update terminal for a specific device
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
    const { browserId, terminalId, locationId } = body;

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

    // Find the device index
    const deviceIndex = location.devices?.findIndex(d => d.browserId === browserId);
    if (deviceIndex === -1 || deviceIndex === undefined) {
      return NextResponse.json({ error: 'Device not found at this location' }, { status: 404 });
    }

    // Update the terminal for this device
    if (terminalId) {
      await Location.findOneAndUpdate(
        { _id: locationId, 'devices.browserId': browserId },
        { $set: { 'devices.$.terminal': terminalId } }
      );
    } else {
      // Remove terminal assignment
      await Location.findOneAndUpdate(
        { _id: locationId, 'devices.browserId': browserId },
        { $unset: { 'devices.$.terminal': '' } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device terminal:', error);
    return NextResponse.json({ error: 'Failed to update terminal' }, { status: 500 });
  }
}
