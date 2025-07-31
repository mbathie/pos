import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal } from '@/models'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST() {
  try {
    await connectDB()
    console.log('🔄 Starting terminal status sync...')
    
    const { employee, error, status } = await getEmployee()

    if (error) {
      console.log('❌ Authentication error:', error)
      return NextResponse.json({ error }, { status })
    }

    console.log('👤 Employee authenticated for status sync:', employee._id)

    // Get all terminals for this org
    const terminals = await Terminal.find({ org: employee.org._id })
    console.log(`📊 Found ${terminals.length} terminals to sync`)

    let updatedCount = 0
    let errorCount = 0

    for (const terminal of terminals) {
      if (!terminal.stripeTerminalId) {
        console.log(`⚠️ Skipping terminal ${terminal._id} - no Stripe ID`)
        continue
      }

      try {
        console.log(`🔍 Checking Stripe status for terminal ${terminal.stripeTerminalId}`)
        
        const stripeReader = await stripe.terminal.readers.retrieve(
          terminal.stripeTerminalId,
          {
            stripeAccount: employee.org.stripeAccountId
          }
        )

        const currentStatus = terminal.status
        const stripeStatus = stripeReader.status

        console.log(`📡 Terminal ${terminal.label}: DB=${currentStatus} → Stripe=${stripeStatus}`)

        if (currentStatus !== stripeStatus) {
          await Terminal.findByIdAndUpdate(terminal._id, {
            status: stripeStatus,
            lastSeen: stripeReader.last_seen_at ? new Date(stripeReader.last_seen_at) : undefined,
            serialNumber: stripeReader.serial_number,
            deviceType: stripeReader.device_type
          })

          console.log(`✅ Updated terminal ${terminal.label}: ${currentStatus} → ${stripeStatus}`)
          updatedCount++
        } else {
          console.log(`✓ Terminal ${terminal.label} status already in sync`)
        }

      } catch (stripeError) {
        console.error(`❌ Failed to sync terminal ${terminal._id}:`, stripeError.message)
        errorCount++
      }
    }

    console.log(`🎉 Status sync completed: ${updatedCount} updated, ${errorCount} errors`)

    return NextResponse.json({
      message: 'Terminal status sync completed',
      updated: updatedCount,
      errors: errorCount,
      total: terminals.length
    }, { status: 200 })

  } catch (error) {
    console.error('💥 Status sync error:', error)
    return NextResponse.json({ error: 'Failed to sync terminal statuses' }, { status: 500 })
  }
} 