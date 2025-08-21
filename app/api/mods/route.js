import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Mod, ModGroup } from '@/models';

// GET all mods (optionally filtered by modGroup)
export async function GET(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modGroupId = searchParams.get('modGroup');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query = { 
      org: employee.org._id,
      deleted: { $ne: true }
    };

    if (modGroupId) {
      query.modGroup = modGroupId;
    }

    if (activeOnly) {
      query.active = true;
    }

    const mods = await Mod.find(query)
      .populate('modGroup')
      .sort({ order: 1, name: 1 });

    return NextResponse.json({ mods });
  } catch (error) {
    console.error('Error fetching mods:', error);
    return NextResponse.json({ error: 'Failed to fetch mods' }, { status: 500 });
  }
}

// POST create a new mod
export async function POST(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Verify the modGroup exists and belongs to the same org
    const modGroup = await ModGroup.findOne({
      _id: data.modGroup,
      org: employee.org._id,
      deleted: { $ne: true }
    });

    if (!modGroup) {
      return NextResponse.json({ error: 'Mod group not found' }, { status: 400 });
    }

    // Check if mod with same name already exists in this group
    const existing = await Mod.findOne({
      modGroup: data.modGroup,
      name: data.name,
      deleted: { $ne: true }
    });

    if (existing) {
      return NextResponse.json({ error: 'Mod with this name already exists in this group' }, { status: 400 });
    }

    const mod = await Mod.create({
      ...data,
      org: employee.org._id
    });

    const populatedMod = await Mod.findById(mod._id).populate('modGroup');

    return NextResponse.json({ mod: populatedMod }, { status: 201 });
  } catch (error) {
    console.error('Error creating mod:', error);
    return NextResponse.json({ error: 'Failed to create mod' }, { status: 500 });
  }
}

// PUT update multiple mods at once (for reordering)
export async function PUT(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mods } = await request.json();

    if (!mods || !Array.isArray(mods)) {
      return NextResponse.json({ error: 'Invalid mods data' }, { status: 400 });
    }

    // Update each mod's order
    const updatePromises = mods.map(mod => 
      Mod.findOneAndUpdate(
        { 
          _id: mod._id,
          org: employee.org._id
        },
        { order: mod.order },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: 'Mods reordered successfully' });
  } catch (error) {
    console.error('Error reordering mods:', error);
    return NextResponse.json({ error: 'Failed to reorder mods' }, { status: 500 });
  }
}