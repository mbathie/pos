import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Employee } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    // Get the authenticated employee making the request
    const { employee: currentEmployee } = await getEmployee();
    
    // Get the PIN and permission from the request
    const { pin, permission } = await request.json();
    
    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }
    
    // Convert PIN to number since it's stored as Int32 in database
    const pinNumber = parseInt(pin, 10);
    
    console.log('PIN check:', {
      orgId: currentEmployee.org._id,
      pinEntered: pin,
      pinNumber: pinNumber,
      currentEmployeeRole: currentEmployee.role
    });
    
    // Find an employee with this PIN in the same organization who has admin or manager role
    const authorizer = await Employee.findOne({
      org: currentEmployee.org._id,
      pin: pinNumber,
      role: { $in: ['ADMIN', 'MANAGER'] },
      active: { $ne: false }
    }).select('name role email pin');
    
    if (!authorizer) {
      return NextResponse.json(
        { error: 'Invalid PIN or insufficient permissions' },
        { status: 401 }
      );
    }
    
    // Log the authorization for audit purposes
    console.log(`Authorization granted by ${authorizer.name} (${authorizer.role}) for permission: ${permission}`);
    
    return NextResponse.json({
      success: true,
      authorized: true,
      authorizer: {
        id: authorizer._id,
        name: authorizer.name,
        role: authorizer.role,
        email: authorizer.email
      },
      permission: permission
    });
    
  } catch (error) {
    console.error('PIN check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify PIN' },
      { status: 500 }
    );
  }
}