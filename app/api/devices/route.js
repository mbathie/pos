import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Location, POSInterface, Terminal } from '@/models';

// GET /api/devices - Get all devices across all locations with their POS interfaces and terminals
export async function GET(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can access device management
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Get all locations with their devices
    const locations = await Location.find({ org: employee.org._id })
      .select('name devices')
      .lean();

    // Get all POS interfaces with their device assignments
    const posInterfaces = await POSInterface.find({ org: employee.org._id })
      .select('name devices')
      .lean();

    // Get all terminals from local database
    const terminals = await Terminal.find({ org: employee.org._id })
      .select('_id label status')
      .lean();

    // Build a map of terminal _id -> terminal details
    const terminalMap = {};
    terminals.forEach(t => {
      terminalMap[t._id.toString()] = {
        id: t._id.toString(),
        label: t.label,
        status: t.status || 'unknown'
      };
    });

    // Build a map of browserId -> POS interface
    const deviceToPosInterface = {};
    posInterfaces.forEach(pi => {
      (pi.devices || []).forEach(device => {
        deviceToPosInterface[device.browserId] = {
          _id: pi._id,
          name: pi.name
        };
      });
    });

    // Build a map of device browserId -> terminal
    const deviceToTerminal = {};
    locations.forEach(loc => {
      (loc.devices || []).forEach(device => {
        if (device.terminal) {
          // device.terminal is the local Terminal _id
          const terminalId = device.terminal._id?.toString() || device.terminal.toString();
          const terminalDetails = terminalMap[terminalId];
          if (terminalDetails) {
            deviceToTerminal[device.browserId] = terminalDetails;
          }
        }
      });
    });

    // Enrich locations with device details
    const enrichedLocations = locations.map(loc => ({
      ...loc,
      devices: (loc.devices || []).map(device => ({
        ...device,
        posInterface: deviceToPosInterface[device.browserId] || null,
        terminal: deviceToTerminal[device.browserId] || null
      }))
    }));

    return NextResponse.json({
      locations: enrichedLocations,
      posInterfaces: posInterfaces.map(pi => ({ _id: pi._id, name: pi.name })),
      terminals: terminals.map(t => ({ id: t._id.toString(), label: t.label, status: t.status }))
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
