import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getEmployee } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { employee, error, status } = await getEmployee()
    
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 })
    }

    console.log('❌ Cancelling payment intent:', paymentIntentId)

    // Cancel the payment intent
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      stripeAccount: employee.org.stripeAccountId
    })

    console.log('✅ Payment intent cancelled:', paymentIntent.status)

    return NextResponse.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      message: 'Payment cancelled successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('❌ Error cancelling payment:', error)
    return NextResponse.json({ 
      error: 'Failed to cancel payment',
      details: error.message 
    }, { status: 500 })
  }
} 