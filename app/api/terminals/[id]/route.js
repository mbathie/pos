import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal } from '@/models'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(req, { params }) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params
    const terminal = await Terminal.findOne({ 
      _id: id, 
      org: employee.org._id 
    }).populate([
      { path: 'location', select: 'name address1 city state' }
    ]).lean()

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    return NextResponse.json(terminal, { status: 200 })
  } catch (error) {
    console.error('Error fetching terminal:', error)
    return NextResponse.json({ error: 'Failed to fetch terminal' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params
    const { label, status: terminalStatus } = await req.json()

    const terminal = await Terminal.findOne({ 
      _id: id, 
      org: employee.org._id 
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    // Update terminal
    if (label) terminal.label = label
    if (terminalStatus) terminal.status = terminalStatus

    await terminal.save()
    await terminal.populate([
      { path: 'location', select: 'name address1 city state' }
    ])

    return NextResponse.json(terminal, { status: 200 })
  } catch (error) {
    console.error('Error updating terminal:', error)
    return NextResponse.json({ error: 'Failed to update terminal' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params
    const terminal = await Terminal.findOne({ 
      _id: id, 
      org: employee.org._id 
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    // Delete from Stripe if we have a terminal ID
    if (terminal.stripeTerminalId) {
      try {
        await stripe.terminal.readers.del(terminal.stripeTerminalId, {
          stripeAccount: employee.org.stripeAccountId
        })
      } catch (stripeError) {
        console.warn('Failed to delete terminal from Stripe:', stripeError.message)
        // Continue with database deletion even if Stripe deletion fails
      }
    }

    // Delete from database
    await Terminal.findByIdAndDelete(id)

    return NextResponse.json({ message: 'Terminal deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting terminal:', error)
    return NextResponse.json({ error: 'Failed to delete terminal' }, { status: 500 })
  }
} 