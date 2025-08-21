import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { ModGroup, Mod } from '@/models';

// GET all mod groups for the organization
export async function GET(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeModsParam = searchParams.get('includeMods');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query = { 
      org: employee.org._id,
      deleted: { $ne: true }
    };

    if (activeOnly) {
      query.active = true;
    }

    const modGroups = await ModGroup.find(query).sort({ order: 1, name: 1 });

    // If includeMods is requested, fetch mods for each group
    if (includeModsParam === 'true') {
      const modGroupsWithMods = await Promise.all(
        modGroups.map(async (group) => {
          const mods = await Mod.find({ 
            modGroup: group._id,
            deleted: { $ne: true },
            ...(activeOnly && { active: true })
          }).sort({ order: 1, name: 1 });
          
          return {
            ...group.toObject(),
            mods
          };
        })
      );
      
      return NextResponse.json({ modGroups: modGroupsWithMods });
    }

    return NextResponse.json({ modGroups });
  } catch (error) {
    console.error('Error fetching mod groups:', error);
    return NextResponse.json({ error: 'Failed to fetch mod groups' }, { status: 500 });
  }
}

// POST create a new mod group
export async function POST(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Check if mod group with same name already exists
    const existing = await ModGroup.findOne({
      org: employee.org._id,
      name: data.name,
      deleted: { $ne: true }
    });

    if (existing) {
      return NextResponse.json({ error: 'Mod group with this name already exists' }, { status: 400 });
    }

    const modGroup = await ModGroup.create({
      ...data,
      org: employee.org._id
    });

    return NextResponse.json({ modGroup }, { status: 201 });
  } catch (error) {
    console.error('Error creating mod group:', error);
    return NextResponse.json({ error: 'Failed to create mod group' }, { status: 500 });
  }
}