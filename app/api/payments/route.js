import { NextResponse } from "next/server"
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { getEmployee } from "@/lib/auth"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"

export async function GET(req) {
  await connectDB()

  const { employee } = await getEmployee()
  const org = await Org.findById(employee.org._id)

  const accountId = org.stripeAccountId

  // Return org details for form pre-population (excluding bank details if already connected)
  const orgDetails = {
    name: org.name,
    businessName: org.stripeBusinessName || org.name,
    businessUrl: org.stripeBusinessUrl,
    firstName: org.stripeRepFirstName,
    lastName: org.stripeRepLastName,
    email: org.stripeRepEmail,
    phone: org.stripeRepPhone,
    dateOfBirth: org.stripeRepDob,
    addressLine1: org.stripeAddressLine1,
    addressLine2: org.stripeAddressLine2,
    addressCity: org.stripeAddressCity,
    addressState: org.stripeAddressState,
    addressPostalCode: org.stripeAddressPostalCode,
    country: org.stripeCountry,
    bankAccountName: org.stripeBankAccountName,
  }

  if (!accountId) {
    return NextResponse.json({
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      orgDetails,
    }, { status: 200 })
  }

  try {
    const account = await stripe.accounts.retrieve(accountId)

    // Get bank account details
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

    // Check identity verification status
    const requirements = account.requirements || {}
    const currentlyDue = requirements.currently_due || []
    const eventuallyDue = requirements.eventually_due || []
    const pendingVerification = requirements.pending_verification || []

    // Check if identity document is required
    const needsIdentityDocument = currentlyDue.some(r =>
      r.includes('individual.verification.document') ||
      r.includes('individual.id_number')
    ) || eventuallyDue.some(r =>
      r.includes('individual.verification.document') ||
      r.includes('individual.id_number')
    )

    // Check if verification is pending review
    const verificationPending = pendingVerification.some(r =>
      r.includes('individual.verification.document')
    )

    // Get verification status - payouts_enabled is the most reliable indicator
    const individual = account.individual || {}

    let identityVerificationStatus = 'not_required'
    if (account.payouts_enabled) {
      // If payouts are enabled, the account is fully verified
      identityVerificationStatus = 'verified'
    } else if (verificationPending) {
      identityVerificationStatus = 'pending'
    } else if (needsIdentityDocument) {
      identityVerificationStatus = 'required'
    }

    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      bank_last4: bankLast4,
      bank_name: bankName,
      identity_verification_status: identityVerificationStatus,
      individual: {
        firstName: individual.first_name,
        lastName: individual.last_name,
        dob: individual.dob,
      },
      requirements: {
        currentlyDue,
        eventuallyDue,
        pendingVerification,
      },
      orgDetails: account.charges_enabled ? null : orgDetails,
    }, { status: 200 })
  } catch (error) {
    console.error('Error retrieving Stripe account:', error)
    return NextResponse.json({
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      error: 'Unable to retrieve Stripe account',
      orgDetails,
    }, { status: 200 })
  }
}
