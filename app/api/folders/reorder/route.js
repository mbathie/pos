import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Folder } from '@/models';

export async function PUT(request) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    const { folderIds, categoryId } = await request.json();

    if (!folderIds || !Array.isArray(folderIds)) {
      return Response.json({ error: 'Invalid folder IDs' }, { status: 400 });
    }

    // Update the order field for each folder
    const updatePromises = folderIds.map((folderId, index) =>
      Folder.findByIdAndUpdate(folderId, { order: index })
    );

    await Promise.all(updatePromises);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error reordering folders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
