import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models";
import { calcCartTotals } from "@/lib/cart"
import { Types } from "mongoose";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { received, change, cart, customer } = await req.json();
  const totals = calcCartTotals(cart.products);

  const transaction = await Transaction.create({
    org: org._id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    employeeId: employee._id,
    customerId: customer?._id ? Types.ObjectId.createFromHexString(customer._id) : undefined,
    locationId: employee.selectedLocationId,
    paymentMethod: "cash",
    cart,
    cash: {
      currency: "AUD",
      received: parseFloat(received).toFixed(2),
      change: parseFloat(change).toFixed(2),
    },
    status: "succeeded"
  });

  return NextResponse.json({ transaction }, { status: 200 });
}
