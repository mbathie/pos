import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Product, Category, Org } from '@/models'

export async function GET(request, { params }) {
  try {
    await connectDB()
    
    const { id } = await params

    // Find the product and populate its organization directly
    const product = await Product.findById(id)
      .select('name desc thumbnail instructionsContent org')
      .populate('org', 'name logo tandcContent addressLine suburb state postcode phone email')
      .lean()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const org = product.org

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
        logo: org?.logo,
        addressLine: org?.addressLine,
        suburb: org?.suburb,
        state: org?.state,
        postcode: org?.postcode,
        phone: org?.phone,
        email: org?.email
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