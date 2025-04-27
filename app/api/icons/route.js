import { NextResponse } from 'next/server';
import { getIcons } from '@/lib/icons'

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q'); // Get the query parameter (search string)

  if (!query) {
    return NextResponse.json({ error: 'Query parameter `q` is required' }, { status: 400 });
  }

  try {
    const data = await getIcons({ query });
    return NextResponse.json(JSON.parse(data), { status: 200 });
  } catch (err) {
    console.error("Error fetching icons:", err);
    return NextResponse.json({ error: 'Failed to fetch icons' }, { status: 500 });
  }
}