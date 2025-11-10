import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Company } from "@/models"

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const { id } = await params;

  try {
    const company = await Company.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const { id } = await params;
  const body = await req.json();

  try {
    const company = await Company.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Update company fields
    const { name, abn, contactName, contactEmail, contactPhone, address, notes, active } = body;

    if (name) company.name = name;
    if (abn !== undefined) company.abn = abn;
    if (contactName) company.contactName = contactName;
    if (contactEmail) company.contactEmail = contactEmail;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (address) company.address = address;
    if (notes !== undefined) company.notes = notes;
    if (active !== undefined) company.active = active;

    await company.save();

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const { id } = await params;

  try {
    const company = await Company.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Soft delete by marking as inactive
    company.active = false;
    await company.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
