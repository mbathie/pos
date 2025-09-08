import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Customer } from "@/models"
import mongoose from "mongoose"
// import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();

  const { name, email, phone, dob, gender, address1, city, state, postcode, agree, signature, org, photo, dependents } = await req.json();

  // Validate age - customer must be 18 or older
  if (dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return NextResponse.json({ 
        error: 'You must be 18 years or older to create an account. Minors should be added as dependents under a parent or guardian account.', 
        field: "dob" 
      }, { status: 400 });
    }
  }

  if (await Customer.findOne({ email }))
    return NextResponse.json({ error: 'email exists', exists: true, field: "email" }, { status: 400 });

  try {
    // const memberId = await generateCustomerId();

    // Ensure each dependent has a proper MongoDB ObjectId
    const dependentsWithIds = (dependents || []).map(dep => ({
      ...dep,
      _id: dep._id ? new mongoose.Types.ObjectId(dep._id) : new mongoose.Types.ObjectId()
    }));

    const customer = await Customer.create({
      name, email, phone, dob, gender, assigned: false,
      photo,
      dependents: dependentsWithIds,
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
      orgs: [org._id],
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
