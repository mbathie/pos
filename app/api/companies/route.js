import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Company } from "@/models"

export async function POST(req) {
  await connectDB();
  const { employee } = await getEmployee();
  const body = await req.json();

  const { name, abn, contactName, contactEmail, contactPhone, address, notes } = body;

  // Check if company with same name already exists for this org
  const existingCompany = await Company.findOne({
    name,
    org: employee.org._id
  });

  if (existingCompany) {
    return NextResponse.json({
      error: 'A company with this name already exists',
      exists: true,
      field: "name"
    }, { status: 400 });
  }

  try {
    const companyData = {
      name,
      abn,
      contactName,
      contactEmail,
      contactPhone,
      address,
      notes,
      org: employee.org._id,
      active: true
    };

    const company = await Company.create(companyData);
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  // Pagination parameters
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 25;
  const sortField = searchParams.get("sortField") || "name";
  const sortDirection = searchParams.get("sortDirection") || "asc";

  const orgId = employee.org._id

  const baseQuery = {
    org: orgId,
    active: true  // Only show active companies by default
  };

  if (search) {
    // Escape special regex characters for MongoDB regex
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    baseQuery.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { abn: { $regex: escaped, $options: 'i' } },
      { contactName: { $regex: escaped, $options: 'i' } },
      { contactEmail: { $regex: escaped, $options: 'i' } },
      { contactPhone: { $regex: escaped, $options: 'i' } }
    ];
  }

  // Build sort object
  const sortObj = {};
  sortObj[sortField] = sortDirection === "desc" ? -1 : 1;

  // For pagination requests, return structured response
  if (searchParams.has("page") || searchParams.has("limit")) {
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      Company.find(baseQuery)
        .select('_id name abn contactName contactEmail contactPhone address createdAt')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Company.countDocuments(baseQuery)
    ]);

    return NextResponse.json({
      companies,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  }

  // For non-paginated requests (e.g., search/autocomplete), return all matching companies
  const companies = await Company.find(baseQuery)
    .select('_id name abn contactName contactEmail contactPhone')
    .sort(sortObj)
    .limit(100); // Limit to 100 for performance

  return NextResponse.json({ companies });
}
