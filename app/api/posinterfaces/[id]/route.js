import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { POSInterface, Product, Folder } from '@/models';

// GET /api/posinterfaces/[id] - Get a specific POS interface with populated data
export async function GET(request, { params }) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can access POS interfaces
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const posInterface = await POSInterface.findOne({
      _id: id,
      org: employee.org._id
    })
      .populate('locations', 'name')
      .populate('devices.locationId', 'name devices');

    if (!posInterface) {
      return NextResponse.json({ error: 'POS interface not found' }, { status: 404 });
    }

    // Populate the items in each category
    const populatedCategories = await Promise.all(
      posInterface.categories.map(async (category) => {
        const populatedItems = await Promise.all(
          category.items.map(async (item) => {
            if (item.itemType === 'folder') {
              const folder = await Folder.findById(item.itemId).lean();
              if (!folder) return { ...item.toObject(), data: null };

              // Populate items in contains array
              const populatedItems = [];
              if (folder.contains && folder.contains.length > 0) {
                const sortedContains = [...folder.contains].sort((a, b) => (a.order || 0) - (b.order || 0));

                for (const containedItem of sortedContains) {
                  if (containedItem.itemType === 'product') {
                    const product = await Product.findById(containedItem.itemId).lean();
                    if (product) {
                      populatedItems.push({
                        itemType: 'product',
                        ...product
                      });
                    }
                  } else if (containedItem.itemType === 'group') {
                    const { ProductGroup } = await import('@/models');
                    const group = await ProductGroup.findById(containedItem.itemId)
                      .populate('products')
                      .populate('variations.products')
                      .lean();
                    if (group) {
                      populatedItems.push({
                        itemType: 'group',
                        ...group
                      });
                    }
                  }
                }
              }

              return {
                ...item.toObject(),
                data: {
                  ...folder,
                  items: populatedItems, // Return unified array in order
                  products: populatedItems.filter(i => i.itemType === 'product'), // Legacy support
                  groups: populatedItems.filter(i => i.itemType === 'group') // Legacy support
                }
              };
            } else if (item.itemType === 'product' || item.itemType === 'divider') {
              const product = await Product.findById(item.itemId).lean();
              return {
                ...item.toObject(),
                data: product
              };
            }
            return item;
          })
        );

        return {
          ...category.toObject(),
          items: populatedItems
        };
      })
    );

    // Enrich with device information
    const ifaceObj = posInterface.toObject();
    const deviceNames = [];
    if (ifaceObj.devices) {
      for (const device of ifaceObj.devices) {
        if (device.locationId && device.locationId.devices) {
          const locationDevice = device.locationId.devices.find(d => d.browserId === device.browserId);
          if (locationDevice && locationDevice.name) {
            deviceNames.push(locationDevice.name);
          }
        }
      }
    }

    const result = {
      ...ifaceObj,
      categories: populatedCategories,
      deviceCount: ifaceObj.devices?.length || 0,
      deviceNames
    };

    return NextResponse.json({ interface: result });
  } catch (error) {
    console.error('Error fetching POS interface:', error);
    return NextResponse.json({ error: 'Failed to fetch POS interface' }, { status: 500 });
  }
}

// PUT /api/posinterfaces/[id] - Update a POS interface
export async function PUT(request, { params }) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can update POS interfaces
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const { name, locations, categories, isDefault, devices } = body;

    const posInterface = await POSInterface.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!posInterface) {
      return NextResponse.json({ error: 'POS interface not found' }, { status: 404 });
    }

    // If setting as default, unset any existing default
    if (isDefault && !posInterface.isDefault) {
      await POSInterface.updateMany(
        { org: employee.org._id, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    // Update fields
    if (name !== undefined) posInterface.name = name;
    if (locations !== undefined) posInterface.locations = locations;
    if (categories !== undefined) posInterface.categories = categories;
    if (isDefault !== undefined) posInterface.isDefault = isDefault;
    if (devices !== undefined) posInterface.devices = devices;

    await posInterface.save();

    return NextResponse.json({ interface: posInterface });
  } catch (error) {
    console.error('Error updating POS interface:', error);
    return NextResponse.json({ error: 'Failed to update POS interface' }, { status: 500 });
  }
}

// DELETE /api/posinterfaces/[id] - Delete a POS interface
export async function DELETE(request, { params }) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can delete POS interfaces
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const posInterface = await POSInterface.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!posInterface) {
      return NextResponse.json({ error: 'POS interface not found' }, { status: 404 });
    }

    await posInterface.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting POS interface:', error);
    return NextResponse.json({ error: 'Failed to delete POS interface' }, { status: 500 });
  }
}
