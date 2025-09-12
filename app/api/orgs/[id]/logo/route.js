import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Org } from '@/models';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    // Find the organization
    const org = await Org.findById(id).select('logo name').lean();
    
    if (!org || !org.logo) {
      // Return a default image or 404
      return new NextResponse('Logo not found', { status: 404 });
    }
    
    // Parse the base64 data URL
    let imageData, mimeType;
    
    if (org.logo.startsWith('data:')) {
      // Extract mime type and base64 data from data URL
      const matches = org.logo.match(/^data:([^;]+);base64,(.+)$/);
      
      if (!matches) {
        console.error('Invalid logo format for org:', id);
        return new NextResponse('Invalid logo format', { status: 400 });
      }
      
      mimeType = matches[1]; // e.g., 'image/jpeg'
      imageData = matches[2]; // base64 string
    } else if (org.logo.startsWith('http')) {
      // If it's already an HTTP URL, redirect to it
      return NextResponse.redirect(org.logo);
    } else {
      // Assume it's raw base64 without the data URL prefix
      mimeType = 'image/jpeg'; // Default to JPEG
      imageData = org.logo;
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');
    
    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType || 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${org.name || 'logo'}.${mimeType?.split('/')[1] || 'jpg'}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving org logo:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}