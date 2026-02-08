import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface, Location } from '@/models';
import { getOrCreateBrowserId } from '@/lib/cookies';

// POST /api/posinterfaces/assign-to-browser - Assign a POS interface to the current browser
export async function POST(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { posInterfaceId } = body;

    if (!posInterfaceId) {
      return NextResponse.json({ error: 'POS interface ID is required' }, { status: 400 });
    }

    // Get or create browser ID
    const browserId = await getOrCreateBrowserId();
    if (!browserId) {
      return NextResponse.json({ error: 'Could not identify browser' }, { status: 400 });
    }

    // Find the POS interface
    const posInterface = await POSInterface.findOne({
      _id: posInterfaceId,
      org: employee.org._id
    });

    if (!posInterface) {
      return NextResponse.json({ error: 'POS interface not found' }, { status: 404 });
    }

    // Find which location has this device (browser)
    const locationWithDevice = await Location.findOne({
      org: employee.org._id,
      'devices.browserId': browserId
    });

    if (!locationWithDevice) {
      // If the browser isn't registered as a device yet, use the employee's selected location
      // or fall back to any location
      let locationId = employee.selectedLocation?._id;

      if (!locationId) {
        const anyLocation = await Location.findOne({ org: employee.org._id });
        if (anyLocation) {
          locationId = anyLocation._id;
        }
      }

      if (!locationId) {
        return NextResponse.json({ error: 'No location found to register device' }, { status: 400 });
      }

      // Register this browser as a device at this location
      await Location.findByIdAndUpdate(locationId, {
        $push: {
          devices: {
            browserId,
            name: `Device ${new Date().toLocaleDateString()}`
          }
        }
      });

      // Remove this device from any other POS interface
      await POSInterface.updateMany(
        { org: employee.org._id },
        { $pull: { devices: { browserId } } }
      );

      // Add to the selected POS interface
      await POSInterface.findByIdAndUpdate(posInterfaceId, {
        $push: {
          devices: {
            locationId,
            browserId
          }
        }
      });
    } else {
      // Remove this device from any other POS interface
      await POSInterface.updateMany(
        { org: employee.org._id },
        { $pull: { devices: { browserId } } }
      );

      // Add to the selected POS interface
      await POSInterface.findByIdAndUpdate(posInterfaceId, {
        $push: {
          devices: {
            locationId: locationWithDevice._id,
            browserId
          }
        }
      });
    }

    return NextResponse.json({ success: true, posInterfaceId });
  } catch (error) {
    console.error('Error assigning POS interface to browser:', error);
    return NextResponse.json({ error: 'Failed to assign POS interface' }, { status: 500 });
  }
}
