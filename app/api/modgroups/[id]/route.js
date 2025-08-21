import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { ModGroup, Mod } from '@/models';

// GET a specific mod group
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMods = searchParams.get('includeMods') === 'true';
    
    // For retail/public access, don't require authentication
    // Just fetch the modGroup by ID
    const modGroup = await ModGroup.findOne({
      _id: id,
      deleted: { $ne: true }
    });

    if (!modGroup) {
      return NextResponse.json({ error: 'Mod group not found' }, { status: 404 });
    }

    let result = modGroup.toObject();

    // Include mods if requested
    if (includeMods) {
      const mods = await Mod.find({ 
        modGroup: modGroup._id,
        deleted: { $ne: true }
      }).sort({ order: 1, name: 1 });
      
      result = {
        ...result,
        mods
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching mod group:', error);
    return NextResponse.json({ error: 'Failed to fetch mod group' }, { status: 500 });
  }
}

// PUT update a mod group
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    
    const modGroup = await ModGroup.findOneAndUpdate(
      { 
        _id: id,
        org: employee.org._id 
      },
      { $set: data },
      { new: true }
    );

    if (!modGroup) {
      return NextResponse.json({ error: 'Mod group not found' }, { status: 404 });
    }

    return NextResponse.json({ modGroup });
  } catch (error) {
    console.error('Error updating mod group:', error);
    return NextResponse.json({ error: 'Failed to update mod group' }, { status: 500 });
  }
}

// DELETE soft delete a mod group
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Soft delete the mod group
    const modGroup = await ModGroup.findOneAndUpdate(
      { 
        _id: id,
        org: employee.org._id 
      },
      { $set: { deleted: true } },
      { new: true }
    );

    if (!modGroup) {
      return NextResponse.json({ error: 'Mod group not found' }, { status: 404 });
    }

    // Also soft delete all mods in this group
    await Mod.updateMany(
      { modGroup: id },
      { $set: { deleted: true } }
    );

    return NextResponse.json({ message: 'Mod group deleted successfully' });
  } catch (error) {
    console.error('Error deleting mod group:', error);
    return NextResponse.json({ error: 'Failed to delete mod group' }, { status: 500 });
  }
}