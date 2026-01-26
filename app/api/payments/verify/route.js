import { NextResponse } from 'next/server'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { getEmployee } from "@/lib/auth"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"

// Set max duration for serverless function
export const maxDuration = 60

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Helper to upload file to Stripe using fetch API
async function uploadFileToStripe(file, stripeAccountId) {
  const formData = new FormData()
  formData.append('purpose', 'identity_document')
  formData.append('file', file)

  const response = await fetch('https://files.stripe.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Stripe-Account': stripeAccountId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[verify] Stripe file upload error response:', error)
    throw new Error(error.error?.message || 'Failed to upload file to Stripe')
  }

  return response.json()
}

export async function POST(request) {
  try {
    await connectDB()

    const { employee } = await getEmployee()
    const org = await Org.findById(employee.org._id)

    if (!org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 })
    }

    if (!org.stripeAccountId) {
      return NextResponse.json(
        { message: 'Stripe account not connected' },
        { status: 400 }
      )
    }

    // Get the form data with uploaded files
    const formData = await request.formData()
    const documentType = formData.get('documentType') // 'drivers_license' or 'passport'
    const frontFile = formData.get('front')
    const backFile = formData.get('back') // Optional for passport

    if (!frontFile || !(frontFile instanceof File)) {
      return NextResponse.json(
        { message: 'Front of document is required' },
        { status: 400 }
      )
    }

    // For driver's license, back is required
    if (documentType === 'drivers_license' && (!backFile || !(backFile instanceof File))) {
      return NextResponse.json(
        { message: 'Back of driver\'s license is required' },
        { status: 400 }
      )
    }

    try {
      // Upload front of document to Stripe
      const frontStripeFile = await uploadFileToStripe(frontFile, org.stripeAccountId)

      // Upload back of document if provided
      let backStripeFile = null
      if (backFile && backFile instanceof File) {
        backStripeFile = await uploadFileToStripe(backFile, org.stripeAccountId)
      }

      // Update the connected account with the verification document
      const updateData = {
        individual: {
          verification: {
            document: {
              front: frontStripeFile.id,
              ...(backStripeFile && { back: backStripeFile.id }),
            },
          },
        },
      }

      await stripe.accounts.update(org.stripeAccountId, updateData)

      return NextResponse.json({
        success: true,
        message: 'Verification document submitted successfully',
      })
    } catch (stripeError) {
      console.error('[verify] Stripe verification error:', stripeError)

      let errorMessage = 'Failed to upload verification document'
      if (stripeError.message) {
        errorMessage = stripeError.message
      }

      return NextResponse.json(
        { message: errorMessage, error: stripeError.code },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('POST /api/payments/verify error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
