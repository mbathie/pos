import { NextResponse } from "next/server"
import { headers } from 'next/headers'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { getEmployee } from "@/lib/auth"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"

// Country-specific configuration
const COUNTRY_CONFIG = {
  AU: { currency: 'aud' },
  US: { currency: 'usd' },
  GB: { currency: 'gbp' },
  NZ: { currency: 'nzd' },
  CA: { currency: 'cad' },
}

export async function POST(request) {
  try {
    await connectDB()

    const { employee } = await getEmployee()
    const org = await Org.findById(employee.org._id)

    if (!org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 })
    }

    // Check if already connected with charges enabled
    if (org.stripeAccountId) {
      try {
        const existingAccount = await stripe.accounts.retrieve(org.stripeAccountId)
        if (existingAccount.charges_enabled) {
          return NextResponse.json(
            { message: 'Stripe account already connected' },
            { status: 400 }
          )
        }
      } catch {
        // Account doesn't exist or is invalid, continue with creation
      }
    }

    const body = await request.json()
    const {
      acceptedTerms,
      businessName,
      businessUrl,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      addressLine1,
      addressLine2,
      addressCity,
      addressState,
      addressPostalCode,
      country,
      bankAccountName,
      bankRoutingNumber,
      bankAccountNumber,
    } = body

    if (!acceptedTerms) {
      return NextResponse.json(
        { message: 'You must accept the Terms of Service' },
        { status: 400 }
      )
    }

    // Get country config
    const countryCode = country || 'AU'
    const countryConfig = COUNTRY_CONFIG[countryCode]
    if (!countryConfig) {
      return NextResponse.json(
        { message: `Unsupported country: ${countryCode}` },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredFields = {
      businessName,
      firstName,
      lastName,
      email,
      dateOfBirth,
      addressLine1,
      addressCity,
      addressPostalCode,
      bankRoutingNumber,
      bankAccountNumber,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Get client IP for TOS acceptance
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

    // Parse date of birth
    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date of birth' },
        { status: 400 }
      )
    }

    // Store the details in the org for future reference (except sensitive bank details)
    await Org.findByIdAndUpdate(org._id, {
      stripeBusinessName: businessName,
      stripeBusinessUrl: businessUrl,
      stripeRepFirstName: firstName,
      stripeRepLastName: lastName,
      stripeRepEmail: email,
      stripeRepPhone: phone,
      stripeRepDob: dob,
      stripeAddressLine1: addressLine1,
      stripeAddressLine2: addressLine2,
      stripeAddressCity: addressCity,
      stripeAddressState: addressState,
      stripeAddressPostalCode: addressPostalCode,
      stripeCountry: countryCode,
      stripeBankAccountName: bankAccountName,
    })

    try {
      // Create Stripe Custom connected account
      const account = await stripe.accounts.create({
        type: 'custom',
        country: countryCode,
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || undefined,
          dob: {
            day: dob.getDate(),
            month: dob.getMonth() + 1,
            year: dob.getFullYear(),
          },
          address: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            city: addressCity,
            state: addressState || undefined,
            postal_code: addressPostalCode,
            country: countryCode,
          },
        },
        business_profile: {
          mcc: '7941', // Sports Clubs/Fields
          name: businessName,
          url: businessUrl || undefined,
          product_description: 'Fitness and Recreation Services',
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: clientIp,
        },
        external_account: {
          object: 'bank_account',
          country: countryCode,
          currency: countryConfig.currency,
          routing_number: bankRoutingNumber.replace(/[-\s]/g, ''),
          account_number: bankAccountNumber.replace(/\s/g, ''),
          account_holder_name: bankAccountName || businessName,
          account_holder_type: 'individual',
        },
        metadata: {
          orgId: org._id.toString(),
        },
      })

      // Update org with Stripe account ID
      await Org.findByIdAndUpdate(org._id, {
        stripeAccountId: account.id,
        stripeOnboardingComplete: true,
        stripeTermsAcceptedAt: new Date(),
        stripeTermsAcceptedIp: clientIp,
      })

      // Get bank account details for response
      let bankLast4 = null
      let bankName = null

      if (account.external_accounts?.data?.length > 0) {
        const bankAccount = account.external_accounts.data.find(
          (ext) => ext.object === 'bank_account'
        )
        if (bankAccount) {
          bankLast4 = bankAccount.last4
          bankName = bankAccount.bank_name
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Stripe account connected successfully',
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        bankLast4,
        bankName,
      })
    } catch (stripeError) {
      console.error('Stripe account creation error:', stripeError)

      // Return user-friendly error message
      let errorMessage = 'Failed to create Stripe account'
      if (stripeError.message) {
        errorMessage = stripeError.message
      }

      return NextResponse.json(
        { message: errorMessage, error: stripeError.code },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('POST /api/payments/setup error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Keep the GET method for backwards compatibility (redirects to Stripe hosted onboarding)
export async function GET(req) {
  await connectDB()

  const { employee } = await getEmployee()
  const org = employee.org

  // Check if account already exists
  if (org.stripeAccountId) {
    try {
      const existingAccount = await stripe.accounts.retrieve(org.stripeAccountId)
      if (existingAccount.charges_enabled) {
        return NextResponse.json(
          { message: 'Stripe account already connected' },
          { status: 400 }
        )
      }
      // Account exists but not complete - create new account link
      const baseUrl = process.env.STRIPE_HOST || process.env.HOST || process.env.NEXT_PUBLIC_API_BASE_URL
      const accountLink = await stripe.accountLinks.create({
        account: org.stripeAccountId,
        refresh_url: `${baseUrl}/settings/payments`,
        return_url: `${baseUrl}/settings/payments?stripeReturn=1`,
        type: 'account_onboarding',
      })
      return NextResponse.json({ ...accountLink }, { status: 200 })
    } catch {
      // Account invalid, create new one below
    }
  }

  const account = await stripe.accounts.create({
    type: 'standard',
    business_profile: {
      url: "https://change.me",
      name: org.name,
      product_description: "Fitness and Entertainment"
    },
    metadata: {
      orgId: org._id.toString()
    }
  })

  await Org.findByIdAndUpdate(org._id, {
    stripeAccountId: account.id
  })

  const baseUrl = process.env.STRIPE_HOST || process.env.HOST || process.env.NEXT_PUBLIC_API_BASE_URL

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/settings/payments`,
    return_url: `${baseUrl}/settings/payments?stripeReturn=1`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ ...accountLink }, { status: 200 })
}
