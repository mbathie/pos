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
      minInvoicePaymentPercent: org.minInvoicePaymentPercent ?? 50,
      paymentTermsDays: org.paymentTermsDays ?? 7,
      bumpScreenGreenMinutes: org.bumpScreenGreenMinutes ?? 2,
      bumpScreenOrangeMinutes: org.bumpScreenOrangeMinutes ?? 5,
      bumpScreenRedMinutes: org.bumpScreenRedMinutes ?? 10
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
    const { minInvoicePaymentPercent, paymentTermsDays, bumpScreenGreenMinutes, bumpScreenOrangeMinutes, bumpScreenRedMinutes } = body;

    // Validate minInvoicePaymentPercent
    if (minInvoicePaymentPercent !== undefined) {
      if (typeof minInvoicePaymentPercent !== 'number' || minInvoicePaymentPercent < 0 || minInvoicePaymentPercent > 100) {
        return NextResponse.json({ message: 'minInvoicePaymentPercent must be a number between 0 and 100' }, { status: 400 });
      }
    }

    // Validate paymentTermsDays
    if (paymentTermsDays !== undefined) {
      if (typeof paymentTermsDays !== 'number' || paymentTermsDays < 1 || paymentTermsDays > 90) {
        return NextResponse.json({ message: 'paymentTermsDays must be a number between 1 and 90' }, { status: 400 });
      }
    }

    // Validate bump screen fields
    const bumpFields = { bumpScreenGreenMinutes, bumpScreenOrangeMinutes, bumpScreenRedMinutes };
    for (const [key, val] of Object.entries(bumpFields)) {
      if (val !== undefined) {
        if (typeof val !== 'number' || val < 0 || val > 120) {
          return NextResponse.json({ message: `${key} must be a number between 0 and 120` }, { status: 400 });
        }
      }
    }

    // Validate green < orange < red when all three are provided or partially updated
    const green = bumpScreenGreenMinutes;
    const orange = bumpScreenOrangeMinutes;
    const red = bumpScreenRedMinutes;
    if (green !== undefined && orange !== undefined && green >= orange) {
      return NextResponse.json({ message: 'Green threshold must be less than orange threshold' }, { status: 400 });
    }
    if (orange !== undefined && red !== undefined && orange >= red) {
      return NextResponse.json({ message: 'Orange threshold must be less than red threshold' }, { status: 400 });
    }
    if (green !== undefined && red !== undefined && green >= red) {
      return NextResponse.json({ message: 'Green threshold must be less than red threshold' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateFields = {};
    if (minInvoicePaymentPercent !== undefined) updateFields.minInvoicePaymentPercent = minInvoicePaymentPercent;
    if (paymentTermsDays !== undefined) updateFields.paymentTermsDays = paymentTermsDays;
    if (bumpScreenGreenMinutes !== undefined) updateFields.bumpScreenGreenMinutes = bumpScreenGreenMinutes;
    if (bumpScreenOrangeMinutes !== undefined) updateFields.bumpScreenOrangeMinutes = bumpScreenOrangeMinutes;
    if (bumpScreenRedMinutes !== undefined) updateFields.bumpScreenRedMinutes = bumpScreenRedMinutes;

    const org = await Org.findByIdAndUpdate(
      employee.org._id,
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      minInvoicePaymentPercent: org.minInvoicePaymentPercent ?? 50,
      paymentTermsDays: org.paymentTermsDays ?? 7,
      bumpScreenGreenMinutes: org.bumpScreenGreenMinutes ?? 2,
      bumpScreenOrangeMinutes: org.bumpScreenOrangeMinutes ?? 5,
      bumpScreenRedMinutes: org.bumpScreenRedMinutes ?? 10
    });

  } catch (error) {
    console.error('Error updating org settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
