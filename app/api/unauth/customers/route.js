import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Customer } from "@/models"
import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();

  const { name, email, phone, address1, city, state, postcode, agree, signature, org } = await req.json();

  if (await Customer.findOne({ email }))
    return NextResponse.json({ error: 'email exists', exists: true, field: "email" }, { status: 400 });

  try {
    const memberId = await generateCustomerId();

    const customer = await Customer.create({
      name, email, phone, assigned: false,
      memberId,
      address: {
        address1,
        city,
        state,
        postcode
      },
      waiver: {
        signature,
        agree,
        signed: new Date()
      },
      orgs: [org._id],
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
