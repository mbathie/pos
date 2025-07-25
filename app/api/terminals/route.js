import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal, Location, Employee } from '@/models'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET() {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const terminals = await Terminal.find({ org: employee.org._id })
      .populate([
        { path: 'location', select: 'name address1 city state' },
        { path: 'employee', select: 'name email' }
      ])
      .lean()

    return NextResponse.json(terminals, { status: 200 })
  } catch (error) {
    console.error('Error fetching terminals:', error)
    return NextResponse.json({ error: 'Failed to fetch terminals' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { locationId, employeeId, label, registrationCode, type } = await req.json()

    if (!locationId || !employeeId || !label) {
      return NextResponse.json({ error: 'Location, employee, and label are required' }, { status: 400 })
    }

    // Verify location exists and belongs to the org
    const location = await Location.findOne({ 
      _id: locationId, 
      org: employee.org._id 
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify employee exists and belongs to the org
    const assignedEmployee = await Employee.findOne({ 
      _id: employeeId, 
      org: employee.org._id 
    })

    if (!assignedEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    let stripeTerminalId = null
    let stripeLocationId = null

    try {
      // Create Stripe Terminal Location if not exists
      // For now, we'll create a basic location - in production you'd want to use actual location data
      const stripeLocation = await stripe.terminal.locations.create({
        display_name: location.name,
        address: {
          line1: location.address1 || '1234 Main Street',
          city: location.city || 'City',
          state: location.state || 'State',
          country: 'AU',
          postal_code: location.postcode || '3000',
        },
      }, {
        stripeAccount: employee.org.stripeAccountId
      })

      stripeLocationId = stripeLocation.id

      // Create Stripe Terminal Reader
      if (type === 'simulated') {
        const reader = await stripe.terminal.readers.create({
          location: stripeLocationId,
          registration_code: 'simulated-wpe',
        }, {
          stripeAccount: employee.org.stripeAccountId
        })
        stripeTerminalId = reader.id
      } else {
        // For physical terminals, we need the registration code
        if (!registrationCode) {
          return NextResponse.json({ error: 'Registration code required for physical terminals' }, { status: 400 })
        }

        const reader = await stripe.terminal.readers.create({
          location: stripeLocationId,
          registration_code: registrationCode,
        }, {
          stripeAccount: employee.org.stripeAccountId
        })
        stripeTerminalId = reader.id
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json({ 
        error: `Stripe error: ${stripeError.message}` 
      }, { status: 400 })
    }

    // Create terminal in database
    const terminal = await Terminal.create({
      label,
      stripeTerminalId,
      registrationCode: type === 'physical' ? registrationCode : undefined,
      type,
      location: locationId,
      employee: employeeId,
      org: employee.org._id,
      status: 'offline' // Will be updated when terminal connects
    })

    // Populate the location and employee for the response
    await terminal.populate([
      { path: 'location', select: 'name address1 city state' },
      { path: 'employee', select: 'name email' }
    ])

    return NextResponse.json(terminal, { status: 201 })
  } catch (error) {
    console.error('Error creating terminal:', error)
    return NextResponse.json({ error: 'Failed to create terminal' }, { status: 500 })
  }
} 