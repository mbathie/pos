import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer, Membership } from "@/models"
import mongoose from "mongoose"
// import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();
  const { employee } = await getEmployee();
  const body = await req.json();

  // Support both old format (direct fields) and new format (customer object)
  const { customer: customerObj, dependents } = body;
  const customerInput = customerObj || body;

  const { name, email, phone, address1, city, state, postcode, dob, gender, agree, signature } = customerInput;

  if (await Customer.findOne({ email }))
    return NextResponse.json({ error: 'email exists', exists: true, field: "email" }, { status: 400 });

  try {
    // const memberId = await generateCustomerId();

    const customerData = {
      name,
      email,
      phone,
      assigned: false,
      // memberId,
      address: {
        address1,
        city,
        state,
        postcode
      },
      orgs: [employee.org._id],
    };

    // Add DOB and gender if provided
    if (dob) customerData.dob = dob;
    if (gender) customerData.gender = gender;

    // Add dependents if provided
    if (dependents && Array.isArray(dependents) && dependents.length > 0) {
      customerData.dependents = dependents;
    }

    // Only add waiver if signature and agree are provided
    if (signature && agree) {
      customerData.waiver = {
        signature,
        agree,
        signed: new Date()
      };
    }

    const customer = await Customer.create(customerData);
    return NextResponse.json({ customer }, { status: 201 });
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
        .select('_id name email phone memberId createdAt waiver photo dependents')  // Include memberId, createdAt, waiver, photo, and dependents
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(baseQuery)
    ]);

    // Fetch active memberships for these customers
    const customerIds = customers.map(c => c._id);
    const activeMemberships = await Membership.find({
      customer: { $in: customerIds },
      status: 'active'
    }).populate('product', 'name');

    // Create a map of customer ID to membership
    const membershipMap = {};
    activeMemberships.forEach(membership => {
      membershipMap[membership.customer.toString()] = membership;
    });

    // Add membership data to customers (with all necessary fields)
    const customersWithMembership = customers.map(customer => {
      return {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        memberId: customer.memberId,
        createdAt: customer.createdAt,
        waiver: customer.waiver,
        photo: customer.photo,
        dependents: customer.dependents,
        membership: membershipMap[customer._id.toString()] || null
      };
    });

    return NextResponse.json({
      customers: customersWithMembership,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    });
  }

  // Legacy behavior for existing endpoints - return essential fields
  // Include waiver status if specifically filtering for waivers
  let selectFields = '_id name email phone memberId dependents waiver';
  if (requiresWaiver === "true" || recentWaiver === "1") {
    selectFields += ' assigned';  // Include assigned status for waiver-specific queries
  }
  
  const customers = await Customer.find(baseQuery)
    .select(selectFields)

  return NextResponse.json(customers)
}
