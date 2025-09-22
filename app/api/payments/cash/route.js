import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCashTransaction, handleTransactionSuccess } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { received, change, cart, customer } = await req.json();

  // Check if cart contains membership products (not allowed for cash payments)
  const hasMemberships = cart.products.some(product => product.type === 'membership');
  
  // Block ALL cash payments for memberships (even zero-dollar)
  // Zero-dollar memberships should go through card payment flow
  if (hasMemberships) {
    return NextResponse.json({
      error: 'Membership products must be paid by card (use Card payment for free memberships)'
    }, { status: 400 });
  }

  // Create the cash transaction (cleanup happens in createCashTransaction)
  const transaction = await createCashTransaction({ cart, employee, received, change });

  // Handle post-transaction success operations (use original cart for pendingDiscountUsage)
  await handleTransactionSuccess({ transaction, cart, employee });

  return NextResponse.json({ transaction }, { status: 200 });
}
