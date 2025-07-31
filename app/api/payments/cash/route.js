import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCashTransaction, handleTransactionSuccess } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { received, change, cart, customer } = await req.json();

  console.log(cart)

  // Create the cash transaction
  const transaction = await createCashTransaction({ cart, employee, received, change });

  // Handle post-transaction success operations
  await handleTransactionSuccess({ transaction, cart: transaction.cart, employee });

  return NextResponse.json({ transaction }, { status: 200 });
}
