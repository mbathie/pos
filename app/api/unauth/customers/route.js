import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Customer } from "@/models"
import mongoose from "mongoose"
import { uploadBase64Image } from "@/lib/spaces"
// import { generateCustomerId } from "@/lib/customers";

export async function POST(req) {
  await connectDB();

  const { name, email, phone, dob, gender, address1, city, state, postcode, agree, signature, org, photo, dependents } = await req.json();

  console.log('Waiver submission received');
  console.log('Photo data length:', photo ? photo.length : 0);
  console.log('Photo starts with data:?', photo ? photo.substring(0, 30) : 'No photo');

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

    // Handle photo upload to Spaces BEFORE creating customer
    let photoUrl = '';
    let signatureUrl = '';

    if (photo && photo.startsWith('data:')) {
      console.log('Attempting to upload photo to Spaces...');
      console.log('Environment check:', {
        hasAccessKey: !!process.env.DO_SPACES_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.DO_SPACES_SECRET_ACCESS_KEY,
        endpoint: process.env.DO_SPACES_ENDPOINT,
        bucket: process.env.DO_SPACES_BUCKET
      });

      // Generate a temporary ID for the upload path
      const tempCustomerId = new mongoose.Types.ObjectId().toString();

      try {
        const { url } = await uploadBase64Image(
          photo,
          'customers',
          tempCustomerId,
          `waiver-photo-${Date.now()}.jpg`
        );

        console.log('Photo uploaded successfully to Spaces:', url);
        photoUrl = url;
      } catch (error) {
        console.error('Error uploading photo to Spaces:', error);
        console.error('Error details:', error.message);
        // Continue without photo if upload fails
      }
    }

    // Handle signature upload to Spaces
    if (signature && signature.startsWith('data:')) {
      console.log('Attempting to upload signature to Spaces...');

      // Use same temp ID as photo if available, otherwise generate new one
      const tempCustomerId = photoUrl ? photoUrl.split('/customers/')[1]?.split('/')[0] : new mongoose.Types.ObjectId().toString();

      try {
        const { url } = await uploadBase64Image(
          signature,
          'customers',
          tempCustomerId,
          `waiver-signature-${Date.now()}.png`
        );

        console.log('Signature uploaded successfully to Spaces:', url);
        signatureUrl = url;
      } catch (error) {
        console.error('Error uploading signature to Spaces:', error);
        // Continue without signature URL if upload fails
      }
    }

    // Create the customer with URLs (or empty strings if uploads failed)
    const customer = await Customer.create({
      name, email, phone, dob, gender, assigned: false,
      photo: photoUrl || '',
      dependents: dependentsWithIds,
      // memberId,
      address: {
        address1,
        city,
        state,
        postcode
      },
      waiver: {
        signature: signatureUrl || signature, // Fallback to base64 if upload failed
        agree,
        signed: new Date()
      },
      orgs: [org._id],
    });

    // Return the updated customer
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
