import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Org } from '@/models';

/**
 * GET /api/org/settings
 * Get organization settings
 */
export async function GET() {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    const org = await Org.findById(employee.org._id).lean();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      minInvoicePaymentPercent: org.minInvoicePaymentPercent ?? 50
    });

  } catch (error) {
    console.error('Error fetching org settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/org/settings
 * Update organization settings
 */
export async function PUT(request) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    const body = await request.json();
    const { minInvoicePaymentPercent } = body;

    // Validate
    if (minInvoicePaymentPercent !== undefined) {
      if (typeof minInvoicePaymentPercent !== 'number' || minInvoicePaymentPercent < 0 || minInvoicePaymentPercent > 100) {
        return NextResponse.json({ message: 'minInvoicePaymentPercent must be a number between 0 and 100' }, { status: 400 });
      }
    }

    const org = await Org.findByIdAndUpdate(
      employee.org._id,
      { $set: { minInvoicePaymentPercent } },
      { new: true }
    ).lean();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      minInvoicePaymentPercent: org.minInvoicePaymentPercent ?? 50
    });

  } catch (error) {
    console.error('Error updating org settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
