import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Org } from "@/models";
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { orgId } = params;
    
    const org = await Org.findById(orgId).select('logo');
    
    if (!org || !org.logo) {
      // Serve the default Cultcha logo as fallback
      const logoPath = path.join(process.cwd(), 'public', 'cultcha-logo-light.png');
      const logoBuffer = fs.readFileSync(logoPath);
      
      return new NextResponse(logoBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Check if logo is base64
    if (org.logo.startsWith('data:')) {
      // Extract base64 data - more flexible regex to handle various formats
      const matches = org.logo.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('Invalid logo format for org:', orgId);
        return new NextResponse(null, { status: 400 });
      }
      
      const [, mimeType, base64Data] = matches;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
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
    
    // Serve default Cultcha logo as fallback on any error
    try {
      const logoPath = path.join(process.cwd(), 'public', 'cultcha-logo-dark.png');
      const logoBuffer = fs.readFileSync(logoPath);
      
      return new NextResponse(logoBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } catch (fallbackError) {
      console.error("Error serving fallback logo:", fallbackError);
      return new NextResponse(null, { status: 500 });
    }
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