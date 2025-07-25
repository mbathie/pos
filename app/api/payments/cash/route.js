import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models";
import { calcCartTotals } from "@/lib/cart"
import { addToSchedule } from '@/lib/schedule'
import { addToCasual } from '@/lib/casual'
import { addToOrder } from '@/lib/order'
import { updateProductQuantities } from '@/lib/product'

import { Types } from "mongoose";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;
  const { received, change, cart, customer } = await req.json();

  console.log(cart)

  const first = getFirstCustomer({ cart });
  const txnCustomer = first?._id
    ? new Types.ObjectId(first._id)
    : cart.customer?._id
      ? new Types.ObjectId(cart.customer._id)
      : undefined;

  cart.products = cart.products.map(p => {
    const { thumbnail, ...rest } = p;
    return rest;
  });
  const totals = calcCartTotals(cart.products, cart.discount);

  const transaction = await Transaction.create({
    org: employee.org._id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount || 0,
    discount: cart.discount?._id || null,
    employee: employee._id,
    customer: txnCustomer,
    location: employee.selectedLocationId,
    paymentMethod: "cash",
    cart,
    cash: {
      currency: "AUD",
      received: parseFloat(received).toFixed(2),
      change: parseFloat(change).toFixed(2),
    },
    status: "succeeded"
  });

  await addToSchedule({transaction, cart, employee})
  await addToCasual({transaction, cart, employee})
  await addToOrder({transaction, cart, employee})
  // await assignCustomers({products: cart.products})

  // Update product quantities
  await updateProductQuantities(cart.products);

  return NextResponse.json({ transaction }, { status: 200 });
}

function getFirstCustomer({ cart }) {
  for (const product of cart.products || []) {
    for (const variation of product.variations || []) {
      for (const price of variation.prices || []) {
        for (const customerEntry of price.customers || []) {
          if (customerEntry?.customer?._id) {
            return customerEntry.customer;
          }
        }
      }
    }
  }
  return null;
}
