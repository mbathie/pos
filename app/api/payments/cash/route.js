import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models";
import { calcCartTotals } from "@/lib/cart"
import { Types } from "mongoose";
import { addToSchedule } from '@/lib/schedule'

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { received, change, cart, customer } = await req.json();
  cart.products = cart.products.map(p => {
    const { thumbnail, ...rest } = p;
    return rest;
  });
  const totals = calcCartTotals(cart.products);

  // console.log(cart)

  const transaction = await Transaction.create({
    org: employee.orgId,
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

  addToSchedule({transaction, cart, employee, customer})

  return NextResponse.json({ }, { status: 200 });


  return NextResponse.json({ transaction }, { status: 200 });
}
