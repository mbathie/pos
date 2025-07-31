import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal, Location } from '@/models'
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
        { path: 'location', select: 'name address1 city state' }
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
    console.log('🔧 Terminal creation started')
    
    const { employee, error, status } = await getEmployee()

    if (error) {
      console.log('❌ Authentication error:', error)
      return NextResponse.json({ error }, { status })
    }

    console.log('👤 Employee authenticated:', {
      employeeId: employee._id,
      orgId: employee.org._id,
      orgName: employee.org.name,
      stripeAccountId: employee.org.stripeAccountId
    })

    const { locationId, label, registrationCode, type } = await req.json()
    console.log('📥 Request payload:', { locationId, label, registrationCode, type })

    if (!locationId || !label) {
      console.log('❌ Validation failed: Missing required fields')
      return NextResponse.json({ error: 'Location and label are required' }, { status: 400 })
    }

    // Verify location exists and belongs to the org
    console.log('🔍 Looking up location:', locationId, 'for org:', employee.org._id)
    const location = await Location.findOne({ 
      _id: locationId, 
      org: employee.org._id 
    })

    if (!location) {
      console.log('❌ Location not found')
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    console.log('📍 Location found:', {
      locationId: location._id,
      name: location.name,
      address1: location.address1,
      city: location.city,
      state: location.state,
      postcode: location.postcode
    })

    let stripeTerminalId = null
    let stripeLocationId = null
    let actualStripeStatus = 'unknown'

    try {
      console.log('🏢 Creating Stripe location...')
      
      const locationPayload = {
        display_name: location.name,
        address: {
          line1: location.address1 || '1234 Main Street',
          city: location.city || 'City',
          state: location.state || 'State',
          country: 'AU',
          postal_code: location.postcode || '3000',
        },
      }
      
      console.log('📦 Stripe location payload:', locationPayload)
      console.log('🔑 Using Stripe account:', employee.org.stripeAccountId)

      const stripeLocation = await stripe.terminal.locations.create(locationPayload, {
        stripeAccount: employee.org.stripeAccountId
      })

      console.log('✅ Stripe location created successfully:', {
        id: stripeLocation.id,
        display_name: stripeLocation.display_name,
        address: stripeLocation.address
      })

      stripeLocationId = stripeLocation.id

      // Create Stripe Terminal Reader
      console.log('🖥️ Creating Stripe terminal reader...')
      console.log('📡 Terminal type:', type)
      
      if (type === 'simulated') {
        console.log('🧪 Creating simulated terminal')
        
        const readerPayload = {
          location: stripeLocationId,
          registration_code: 'simulated-wpe',
        }
        
        console.log('📦 Simulated reader payload:', readerPayload)
        
        const reader = await stripe.terminal.readers.create(readerPayload, {
          stripeAccount: employee.org.stripeAccountId
        })
        
                 console.log('✅ Simulated reader created:', {
           id: reader.id,
           device_type: reader.device_type,
           status: reader.status
         })
         
         stripeTerminalId = reader.id
         
         // Store the actual Stripe status
         actualStripeStatus = reader.status
      } else {
        // For physical terminals, we need the registration code
        if (!registrationCode) {
          console.log('❌ Physical terminal missing registration code')
          return NextResponse.json({ error: 'Registration code required for physical terminals' }, { status: 400 })
        }

        console.log('🔌 Creating physical terminal')
        console.log('📝 Registration details:', {
          stripeLocationId,
          registrationCode,
          stripeAccountId: employee.org.stripeAccountId
        })

        const readerPayload = {
          location: stripeLocationId,
          registration_code: registrationCode,
        }
        
        console.log('📦 Physical reader payload:', readerPayload)

        const reader = await stripe.terminal.readers.create(readerPayload, {
          stripeAccount: employee.org.stripeAccountId
        })
        
                 console.log('✅ Physical reader created:', {
           id: reader.id,
           device_type: reader.device_type,
           device_sw_version: reader.device_sw_version,
           serial_number: reader.serial_number,
           status: reader.status,
           location: reader.location
         })
         
         stripeTerminalId = reader.id
         
         // Store the actual Stripe status
         actualStripeStatus = reader.status
      }
    } catch (stripeError) {
      console.error('❌ Stripe API error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId
      })
      
      if (stripeError.raw) {
        console.error('📄 Raw Stripe error:', stripeError.raw)
      }
      
      return NextResponse.json({ 
        error: `Stripe error: ${stripeError.message}` 
      }, { status: 400 })
    }

    console.log('💾 Saving terminal to database...')
    
    const terminalData = {
      label,
      stripeTerminalId,
      registrationCode: type === 'physical' ? registrationCode : undefined,
      type,
      location: locationId,
      org: employee.org._id,
      status: actualStripeStatus // Use actual Stripe status
    }
    
    console.log('📦 Terminal data to save:', terminalData)

    // Create terminal in database
    const terminal = await Terminal.create(terminalData)
    
    console.log('✅ Terminal saved to database:', {
      terminalId: terminal._id,
      stripeTerminalId: terminal.stripeTerminalId
    })

    // Populate the location for the response
    await terminal.populate([
      { path: 'location', select: 'name address1 city state' }
    ])

    console.log('🎉 Terminal creation completed successfully')
    
    return NextResponse.json(terminal, { status: 201 })
  } catch (error) {
    console.error('💥 Unexpected error during terminal creation:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ error: 'Failed to create terminal' }, { status: 500 })
  }
} 