import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Customer } from '@/models';
import QRCode from 'qrcode';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    // Find the customer by ID or memberId
    let customer;
    
    // Check if it's a MongoDB ObjectId (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      customer = await Customer.findById(id).select('memberId name');
    } else {
      // Try to find by memberId
      customer = await Customer.findOne({ memberId: parseInt(id, 10) }).select('memberId name');
    }
    
    if (!customer) {
      return new NextResponse('Customer not found', { status: 404 });
    }
    
    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'customer',
      memberId: customer.memberId,
      name: customer.name
    });
    
    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Return the image with appropriate headers
    return new NextResponse(qrCodeBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    return new NextResponse('Failed to generate QR code', { status: 500 });
  }
}