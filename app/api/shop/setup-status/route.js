import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET() {
  await connectDB()
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  // If setup is already complete, return early
  if (employee.org.posSetupComplete) {
    return NextResponse.json({
      setupComplete: true,
      stripeConnected: true,
      hasTerminal: true
    })
  }

  // Otherwise check setup status
  let stripeConnected = false
  try {
    if (employee.org.stripeAccountId) {
      const account = await stripe.accounts.retrieve(employee.org.stripeAccountId)
      stripeConnected = account.charges_enabled === true
    }
  } catch (e) {
    stripeConnected = false
  }

  return NextResponse.json({
    setupComplete: false,
    stripeConnected
  })
}
