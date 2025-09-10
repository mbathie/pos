import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Customer } from "@/models";

export async function GET() {
  const timings = {};
  const start = Date.now();
  
  try {
    // Test connection time
    const connectStart = Date.now();
    await connectDB();
    timings.connectionTime = Date.now() - connectStart;
    
    // Test simple query time
    const queryStart = Date.now();
    const count = await Customer.countDocuments();
    timings.queryTime = Date.now() - queryStart;
    
    // Test find query time
    const findStart = Date.now();
    const customers = await Customer.find().limit(5);
    timings.findTime = Date.now() - findStart;
    
    timings.totalTime = Date.now() - start;
    
    return NextResponse.json({
      success: true,
      timings: {
        ...timings,
        all: `${timings.totalTime}ms`
      },
      results: {
        customerCount: count,
        customersFound: customers.length
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      timings: {
        failedAfter: `${Date.now() - start}ms`
      }
    }, { status: 500 });
  }
}