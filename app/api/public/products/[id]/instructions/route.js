import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Product, Category, Org } from '@/models'

export async function GET(request, { params }) {
  try {
    await connectDB()
    
    const { id } = await params

    // Find the product and populate its category to get the organization
    const product = await Product.findById(id)
      .select('name desc thumbnail instructionsContent category')
      .populate({
        path: 'category',
        select: 'org',
        populate: {
          path: 'org',
          select: 'name logo'
        }
      })
      .lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const org = product.category?.org

    // Product instructions only - no fallback to org level
    const instructions = product.instructionsContent || null

    return NextResponse.json({
      product: {
        id: product._id,
        name: product.name,
        description: product.desc,
        thumbnail: product.thumbnail
      },
      org: {
        id: org?._id,
        name: org?.name,
        logo: org?.logo
      },
      instructions
    })
  } catch (error) {
    console.error('Error fetching product instructions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instructions' },
      { status: 500 }
    )
  }
}