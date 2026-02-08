import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface } from '@/models';

// GET /api/posinterfaces/available - List available POS interfaces for selection (any authenticated user)
export async function GET(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Return basic info about all POS interfaces for this org
    const interfaces = await POSInterface.find({ org: employee.org._id })
      .select('name isDefault')
      .sort({ isDefault: -1, name: 1 });

    return NextResponse.json({ interfaces });
  } catch (error) {
    console.error('Error fetching available POS interfaces:', error);
    return NextResponse.json({ error: 'Failed to fetch POS interfaces' }, { status: 500 });
  }
}
