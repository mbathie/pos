import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Org } from "@/models";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { orgId } = params;
    
    const org = await Org.findById(orgId).select('logo');
    
    if (!org || !org.logo) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if logo is base64
    if (org.logo.startsWith('data:image')) {
      // Extract base64 data
      const matches = org.logo.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return new NextResponse(null, { status: 400 });
      }
      
      const [, mimeType, base64Data] = matches;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': `image/${mimeType}`,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } else if (org.logo.startsWith('http')) {
      // If it's already a URL, redirect to it
      return NextResponse.redirect(org.logo);
    }
    
    return new NextResponse(null, { status: 400 });
  } catch (error) {
    console.error("Error serving logo:", error);
    return new NextResponse(null, { status: 500 });
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}