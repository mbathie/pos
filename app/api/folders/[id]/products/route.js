import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Product } from "@/models";
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { id } = await params;

  console.log(id)

  const products = await Product.aggregate([
    {
      $match: {
        folder: new mongoose.Types.ObjectId(id),
        deleted: { $ne: true }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $match: {
        'category.org': employee.org._id
      }
    }
  ]);

  return NextResponse.json({ products }, { status: 200 });
}