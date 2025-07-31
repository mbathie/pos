import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"
// import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();
  const { employee } = await getEmployee();
  // console.log(employee)
  const { name, email, phone, address1, city, state, postcode, agree, signature } = await req.json();

  if (await Customer.findOne({ email }))
    return NextResponse.json({ error: 'email exists', exists: true, field: "email" }, { status: 400 });

  try {
    // const memberId = await generateCustomerId();

    const customer = await Customer.create({
      name, email, phone, assigned: false,
      // memberId,
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
  
  // Pagination parameters
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 25;
  const sortField = searchParams.get("sortField") || "createdAt";
  const sortDirection = searchParams.get("sortDirection") || "desc";
  
  const orgId = employee.org._id

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
    ];

    const asNumber = Number(search);
    if (!isNaN(asNumber)) {
      baseQuery.$or.push({ memberId: asNumber });
    }
  }

  if (requiresWaiver === "true") {
    baseQuery["waiver.agree"] = true;
  }
  else if (recentWaiver === "1") {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    baseQuery["waiver.agree"] = true;
    baseQuery.createdAt = { $gte: twoHoursAgo };
    baseQuery.assigned = false;
  }

  // Build sort object
  const sortObj = {};
  sortObj[sortField] = sortDirection === "desc" ? -1 : 1;

  // For pagination requests, return structured response
  if (searchParams.has("page") || searchParams.has("limit")) {
    const skip = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      Customer.find(baseQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(baseQuery)
    ]);

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    });
  }

  // Legacy behavior for existing endpoints
  const customers = await Customer.find(baseQuery)

  return NextResponse.json(customers)
}
