import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCashTransaction, handleTransactionSuccess } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { received, change, cart, customer } = await req.json();

  console.log(cart)

  // Check if cart contains membership products (not allowed for cash payments)
  const hasMemberships = cart.products.some(product => product.type === 'membership');
  
  if (hasMemberships) {
    return NextResponse.json({
      error: 'Membership products must be paid by card for subscription setup'
    }, { status: 400 });
  }

  // Create the cash transaction
  const transaction = await createCashTransaction({ cart, employee, received, change });

  // Handle post-transaction success operations
  await handleTransactionSuccess({ transaction, cart: transaction.cart, employee });

  return NextResponse.json({ transaction }, { status: 200 });
}
