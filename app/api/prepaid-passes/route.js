import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { PrepaidPass } from '@/models';

export async function GET(request) {
  await connectDB();

  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    const query = { org: employee.org._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by code directly on the query
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    // Build sort - only for direct fields
    const directSortFields = ['remainingPasses', 'totalPasses', 'createdAt', 'code', 'status'];
    const sort = {};
    if (directSortFields.includes(sortField)) {
      sort[sortField] = sortDirection === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    const [passes, totalCount] = await Promise.all([
      PrepaidPass.find(query)
        .populate('customer', 'name email phone photo')
        .populate('pack', 'name thumbnail')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PrepaidPass.countDocuments(query),
    ]);

    // Client-side search on populated fields if search term exists
    let filteredPasses = passes;
    if (search) {
      const q = search.toLowerCase();
      filteredPasses = passes.filter(p =>
        p.code?.toLowerCase().includes(q) ||
        p.customer?.name?.toLowerCase().includes(q) ||
        p.customer?.email?.toLowerCase().includes(q)
      );
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      passes: filteredPasses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching prepaid passes:', error);
    return NextResponse.json({ error: 'Failed to fetch prepaid passes' }, { status: 500 });
  }
}
