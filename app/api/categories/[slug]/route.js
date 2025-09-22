import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category } from "@/models";
import { uploadBase64Image, deleteImage } from "@/lib/spaces";



export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug } = await params;

  const body = await req.json();
  let { menu, thumbnail } = body;

  // Handle thumbnail upload if it's base64
  if (thumbnail && (thumbnail.startsWith('data:image/jpeg') || thumbnail.startsWith('data:image/png'))) {
    try {
      const categoryId = slug + Date.now(); // Use slug + timestamp for unique ID
      const { url } = await uploadBase64Image(
        thumbnail,
        'categories',
        categoryId,
        `category-${Date.now()}.jpg`
      );
      thumbnail = url; // Replace base64 with the Spaces URL
      console.log('Category thumbnail uploaded to Spaces:', url);
    } catch (error) {
      console.error('Error uploading category thumbnail to Spaces:', error);
      return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
    }
  }

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const query = isValidObjectId
    ? { _id: slug, org }
    : { name: slug, org };

  const update = isValidObjectId ? {} : {
    name: slug,
    org: employee.orgId,
    ...(menu && { menu }),
    ...(thumbnail && { thumbnail })
  };

  const category = await Category.findOneAndUpdate(
    query,
    update,
    { new: true, upsert: !isValidObjectId }
  );

  return NextResponse.json({ category }, { status: 201 });
}

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug: name } = await params;

  if (!name) {
    return NextResponse.json({ error: "Missing category name" }, { status: 400 });
  }

  const category = await Category.findOne({ name, org: org._id });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function PUT(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug } = await params;
  const body = await req.json();
  const updateData = {};

  // Only update fields that are provided
  if (body.order !== undefined) updateData.order = body.order;
  if (body.name !== undefined) updateData.name = body.name;

  // Handle thumbnail upload if it's base64
  if (body.thumbnail !== undefined) {
    let thumbnail = body.thumbnail;

    if (thumbnail && (thumbnail.startsWith('data:image/jpeg') || thumbnail.startsWith('data:image/png'))) {
      try {
        // First, get the existing category to check for old thumbnail
        const existingCategory = await Category.findOne({ _id: slug, org: org._id });
        if (existingCategory && existingCategory.thumbnail) {
          try {
            await deleteImage(existingCategory.thumbnail);
          } catch (error) {
            console.error('Error deleting old category thumbnail:', error);
          }
        }

        const categoryId = slug;
        const { url } = await uploadBase64Image(
          thumbnail,
          'categories',
          categoryId,
          `category-${Date.now()}.jpg`
        );
        thumbnail = url; // Replace base64 with the Spaces URL
        console.log('Category thumbnail uploaded to Spaces:', url);
      } catch (error) {
        console.error('Error uploading category thumbnail to Spaces:', error);
        return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
      }
    }
    updateData.thumbnail = thumbnail;
  }

  if (!slug) {
    return NextResponse.json({ error: "Missing category ID" }, { status: 400 });
  }

  // Find and update category
  const category = await Category.findOneAndUpdate(
    { _id: slug, org: org._id },
    updateData,
    { new: true }
  );

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing category ID" }, { status: 400 });
  }

  // Find category
  const category = await Category.findOne({ 
    _id: slug, 
    org: org._id 
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }


  // Soft delete by setting deleted flag to true
  category.deleted = true;
  console.log("Category to delete:", category);
  await category.save();

  return NextResponse.json({ success: true, message: "Category deleted successfully" });
}