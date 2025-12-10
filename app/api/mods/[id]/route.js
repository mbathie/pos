import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Mod } from '@/models';

// GET a specific mod
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const mod = await Mod.findOne({
      _id: id,
      org: employee.org._id,
      deleted: { $ne: true }
    }).populate('modGroup');

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json({ mod });
  } catch (error) {
    console.error('Error fetching mod:', error);
    return NextResponse.json({ error: 'Failed to fetch mod' }, { status: 500 });
  }
}

// PUT update a mod
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // If setting isDefault to true, first unset all other defaults in the same group
    if (data.isDefault === true) {
      const existingMod = await Mod.findOne({ _id: id, org: employee.org._id });
      if (existingMod) {
        await Mod.updateMany(
          {
            modGroup: existingMod.modGroup,
            org: employee.org._id,
            _id: { $ne: id }
          },
          { $set: { isDefault: false } }
        );
      }
    }

    const mod = await Mod.findOneAndUpdate(
      {
        _id: id,
        org: employee.org._id
      },
      { $set: data },
      { new: true }
    ).populate('modGroup');

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json({ mod });
  } catch (error) {
    console.error('Error updating mod:', error);
    return NextResponse.json({ error: 'Failed to update mod' }, { status: 500 });
  }
}

// DELETE soft delete a mod
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const mod = await Mod.findOneAndUpdate(
      { 
        _id: id,
        org: employee.org._id 
      },
      { $set: { deleted: true } },
      { new: true }
    );

    if (!mod) {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Mod deleted successfully' });
  } catch (error) {
    console.error('Error deleting mod:', error);
    return NextResponse.json({ error: 'Failed to delete mod' }, { status: 500 });
  }
}