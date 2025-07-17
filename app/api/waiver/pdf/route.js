import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request) {
  await connectDB();
  
  const { employee } = await getEmployee();
  
  try {
    // Generate QR code as data URL with primary color and transparent background
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee.org._id}/waiver`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#5CB85C', // Primary color
        light: '#00000000' // Transparent background
      }
    });

    // Save QR code to temporary file
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrCodePath = path.join(process.cwd(), 'tmp', 'qrcode.png');
    fs.writeFileSync(qrCodePath, qrCodeBuffer);

    // Save high-resolution logo to temporary file if it exists
    let logoPath = null;
    try {
      const originalLogoPath = path.join(process.cwd(), 'public', 'android-chrome-512x512.png');
      if (fs.existsSync(originalLogoPath)) {
        logoPath = path.join(process.cwd(), 'tmp', 'logo.png');
        fs.copyFileSync(originalLogoPath, logoPath);
      }
    } catch (logoError) {
      console.warn('Could not copy logo:', logoError);
    }

    // Font paths - use Playball for header and Inter for footer
    const playballFontPath = path.join(process.cwd(), 'fonts', 'Playball-Regular.ttf');
    const interFontPath = path.join(process.cwd(), 'fonts', 'Inter-Regular.ttf');

    // Create PDF generation script
    const pdfScript = `
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Organization data
const org = ${JSON.stringify(employee.org)};
const qrCodePath = '${qrCodePath}';
const logoPath = ${logoPath ? `'${logoPath}'` : 'null'};
const outputPath = path.join(process.cwd(), 'tmp', 'waiver.pdf');
const playballFontPath = '${playballFontPath}';
const interFontPath = '${interFontPath}';

// Helper function to get text offset for proper centering (like your implementation)
function getOffset(fontPath, fontSize, text) {
  try {
    const doc = new PDFDocument({ size: 'A5', margin: 0 });
    const heightOfString = doc.font(fontPath).fontSize(fontSize).heightOfString(text);
    const diff = heightOfString - fontSize;
    return 0 - diff;
  } catch (error) {
    console.warn('Font offset calculation failed, using default:', error.message);
    return 0;
  }
}

// Create a document - A5 size
const doc = new PDFDocument({
  size: 'A5',
  margin: 0
});

doc.pipe(fs.createWriteStream(outputPath));

// Set up dimensions (A5: 148.5 x 210 mm = 420.9 x 595.3 points)
const pageWidth = 420.9;
const pageHeight = 595.3;

// Create plain background with theme color
doc.rect(0, 0, pageWidth, pageHeight)
   .fill('#5CB85C'); // Primary green color

// Add high-resolution logo if available
if (logoPath && fs.existsSync(logoPath)) {
  const logoSize = 34; // 12mm in points
  const logoX = (pageWidth - logoSize) / 2;
  doc.image(logoPath, logoX, 42.5, { width: logoSize, height: logoSize });
}

// Add title text with Playball script font
const titleFontSize = 28; // Slightly larger for script font
const titleText = 'Signup and Waiver'; // More elegant capitalization for script font
const titleY = 113.4;

// Check if Playball font exists, fallback to default if not
if (fs.existsSync(playballFontPath)) {
  try {
    const titleOffset = getOffset(playballFontPath, titleFontSize, titleText);
    doc.font(playballFontPath)
       .fontSize(titleFontSize)
       .fillColor('white')
       .text(titleText, 50, titleY + titleOffset, { 
         width: pageWidth - 100, 
         align: 'center' 
       });
    console.log('Using Playball script font for title');
  } catch (fontError) {
    console.warn('Playball font failed, using fallback:', fontError.message);
    // Fallback to default font
    doc.fontSize(20)
       .fillColor('white')
       .text('SIGNUP AND WAIVER', 50, titleY, { 
         width: pageWidth - 100, 
         align: 'center' 
       });
  }
} else {
  console.log('Playball font not found, using default font');
  // Fallback to default font
  doc.fontSize(20)
     .fillColor('white')
     .text('SIGNUP AND WAIVER', 50, titleY, { 
       width: pageWidth - 100, 
       align: 'center' 
     });
}

// Add QR code container with white rounded background
const qrSize = 170; // 60mm in points
const qrX = (pageWidth - qrSize) / 2;
const qrY = 170;

// Add white rounded background for QR code
const containerPadding = 22.7; // 8mm in points
const containerSize = qrSize + (containerPadding * 2);
const containerX = qrX - containerPadding;
const containerY = qrY - containerPadding;

// Draw rounded rectangle background
doc.roundedRect(containerX, containerY, containerSize, containerSize, 22.7)
   .fill('white');

// Add QR code on top of white background
doc.image(qrCodePath, qrX, qrY, { width: qrSize, height: qrSize });

// Add footer section - organization info
const footerStartY = pageHeight - 70.9; // 25mm from bottom
let currentY = footerStartY;
const lineSpacing = 8.5; // 3mm in points

// Check if Inter font exists and use it for footer, otherwise fallback to default
if (fs.existsSync(interFontPath)) {
  try {
    doc.font(interFontPath);
    console.log('Using Inter font for footer text');
  } catch (fontError) {
    console.warn('Inter font failed, using default for footer:', fontError.message);
  }
} else {
  console.log('Inter font not found, using default font for footer');
}

// Add org name first if it exists
if (org.name) {
  doc.fontSize(9).fillColor('white')
     .text(org.name, 50, currentY, { 
       width: pageWidth - 100, 
       align: 'center' 
     });
  currentY += lineSpacing;
}

// Add other fields only if they have values
doc.fontSize(8).fillColor('white');

if (org.address) {
  doc.text(org.address, 50, currentY, { 
    width: pageWidth - 100, 
    align: 'center' 
  });
  currentY += lineSpacing;
}

if (org.phone) {
  doc.text(org.phone, 50, currentY, { 
    width: pageWidth - 100, 
    align: 'center' 
  });
  currentY += lineSpacing;
}

if (org.email) {
  doc.text(org.email, 50, currentY, { 
    width: pageWidth - 100, 
    align: 'center' 
  });
}

doc.end();
console.log('PDF generated successfully with Playball script font for header and Inter font for footer');
`;

    // Write the PDF generation script to a temporary file
    const scriptPath = path.join(process.cwd(), 'tmp', 'generate-pdf.js');
    fs.writeFileSync(scriptPath, pdfScript);

    // Execute the PDF generation script
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`);
    
    if (stderr) {
      console.warn('PDF generation warnings:', stderr);
    }
    
    console.log('PDF generation output:', stdout);

    // Read the generated PDF file
    const pdfPath = path.join(process.cwd(), 'tmp', 'waiver.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file was not generated');
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    // Clean up temporary files
    try {
      fs.unlinkSync(qrCodePath);
      fs.unlinkSync(scriptPath);
      fs.unlinkSync(pdfPath);
      if (logoPath && fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="waiver-qr-code.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    }, { status: 500 });
  }
} 