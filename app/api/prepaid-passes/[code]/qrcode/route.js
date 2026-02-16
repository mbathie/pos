import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { PrepaidPass } from '@/models';
import QRCode from 'qrcode';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { code } = await params;

    const pass = await PrepaidPass.findOne({ code });
    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const qrBuffer = await QRCode.toBuffer(`PP:${code}`, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    return new NextResponse(qrBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
