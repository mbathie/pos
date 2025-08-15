import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/auth";
import { generateCustomerQRCode } from "@/lib/utils/qrcode";

export async function GET(req, { params }) {
  try {
    // Authenticate the customer
    const { customer, error, status } = await getCustomer(req);
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id: customerId } = await params;
    
    // Ensure customer can only access their own data
    if (customer.id !== customerId) {
      return NextResponse.json({ 
        error: "Forbidden" 
      }, { status: 403 });
    }

    // Generate QR code for the customer
    const qrCode = await generateCustomerQRCode(customer.id);

    // Return customer data with QR code
    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        qrCode: qrCode // Base64 encoded QR code image
      }
    });

  } catch (error) {
    console.error("Customer details error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
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