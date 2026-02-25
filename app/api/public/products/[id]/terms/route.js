import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Product, Category, Org, PrepaidPack } from '@/models'

export async function GET(request, { params }) {
  try {
    await connectDB()

    const { id } = await params

    // Find the product and populate its organization directly
    let product = await Product.findById(id)
      .select('name desc thumbnail tandcContent org')
      .populate('org', 'name logo tandcContent addressLine suburb state postcode phone email')
      .lean()

    // If not found as a Product, check PrepaidPack
    if (!product) {
      const pack = await PrepaidPack.findById(id)
        .select('name description thumbnail tandcContent org')
        .populate('org', 'name logo tandcContent addressLine suburb state postcode phone email')
        .lean()

      if (pack) {
        product = {
          _id: pack._id,
          name: pack.name,
          desc: pack.description,
          thumbnail: pack.thumbnail,
          tandcContent: pack.tandcContent,
          org: pack.org
        }
      }
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const org = product.org

    // Determine which terms to show - product specific or organization general
    const terms = product.tandcContent || org?.tandcContent || null
    const isProductSpecific = !!product.tandcContent

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
      terms,
      isProductSpecific
    })
  } catch (error) {
    console.error('Error fetching product terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terms and conditions' },
      { status: 500 }
    )
  }
}