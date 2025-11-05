import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface, Location } from '@/models';
import { cookies } from 'next/headers';

// GET /api/posinterfaces/for-device - Get the POS interface assigned to the current device
export async function GET(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the current browserId from the browser-id API
    const cookieStore = await cookies();
    let browserId = cookieStore.get('browserId')?.value;

    if (!browserId) {
      // Try to get it from the request
      const browserIdRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/browser-id`, {
        headers: request.headers
      });

      if (browserIdRes.ok) {
        const data = await browserIdRes.json();
        browserId = data.browserId;
      }
    }

    if (!browserId) {
      return NextResponse.json({ posInterface: null });
    }

    // Find the location that contains this device
    const location = await Location.findOne({
      org: employee.org._id,
      'devices.browserId': browserId
    });

    if (!location) {
      return NextResponse.json({ posInterface: null });
    }

    // Find a POS interface that has this device assigned
    const posInterface = await POSInterface.findOne({
      org: employee.org._id,
      'devices': {
        $elemMatch: {
          locationId: location._id,
          browserId: browserId
        }
      }
    });

    if (!posInterface) {
      // If no specific interface assigned, return the default one
      const defaultInterface = await POSInterface.findOne({
        org: employee.org._id,
        isDefault: true
      });

      return NextResponse.json({ posInterface: defaultInterface });
    }

    return NextResponse.json({ posInterface });
  } catch (error) {
    console.error('Error fetching POS interface for device:', error);
    return NextResponse.json({ error: 'Failed to fetch POS interface' }, { status: 500 });
  }
}
