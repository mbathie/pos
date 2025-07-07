import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"
import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();
  const { employee } = await getEmployee();
  console.log(employee)
  const { name, email, phone, address1, city, state, postcode, agree, signature } = await req.json();

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
      orgs: [employee.org._id],
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const requiresWaiver = searchParams.get("requiresWaiver")
  const recentWaiver = searchParams.get("recentWaiver")
  const orgId = employee.org._id

  // if (!search)
  //   return NextResponse.json({ error: "Missing search parameter" }, { status: 400 })

  const baseQuery = {
    orgs: orgId,
  };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, "i");
    baseQuery.$or = [
      { name: { $regex: regex } },
      { email: { $regex: regex } },
      { phone: { $regex: regex } },
      { memberId: { $regex: regex } }
    ];
  }

  if (requiresWaiver === "true") {
    // const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    baseQuery["waiver.agree"] = true;
    // baseQuery.createdAt = { $gte: twoHoursAgo };
    // baseQuery.assigned = false;
  }
  else if (recentWaiver === "1") {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    baseQuery["waiver.agree"] = true;
    baseQuery.createdAt = { $gte: twoHoursAgo };
    baseQuery.assigned = false;
  }

  console.log(baseQuery)

  const customers = await Customer.find(baseQuery)

  // console.log(customers)

  return NextResponse.json(customers)
}
