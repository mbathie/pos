import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Transaction, Schedule, Customer, Company, Product, Order } from "@/models"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * GET /api/bookings?scheduleId=xxx&datetime=xxx
 * Fetch booking details for a company/group booking
 */
export async function GET(req) {
  try {
    await connectDB()
    const { employee } = await getEmployee()
    const orgId = employee.org._id
    const locationId = employee.selectedLocationId

    const { searchParams } = new URL(req.url)
    const scheduleId = searchParams.get('scheduleId')
    const datetime = searchParams.get('datetime')

    if (!scheduleId || !datetime) {
      return NextResponse.json({ error: 'scheduleId and datetime are required' }, { status: 400 })
    }

    // Find the schedule
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      org: orgId
    })
      .populate('product', 'name type thumbnail variations prices duration')
      .lean()

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Find the specific class/datetime within the schedule
    const locationData = schedule.locations?.find(
      loc => loc.location?.toString() === locationId?.toString()
    )

    if (!locationData) {
      return NextResponse.json({ error: 'Location not found in schedule' }, { status: 404 })
    }

    const classData = locationData.classes?.find(
      cls => new Date(cls.datetime).toISOString() === new Date(datetime).toISOString()
    )

    if (!classData) {
      return NextResponse.json({ error: 'Class not found for the specified datetime' }, { status: 404 })
    }

    // Collect customer and company IDs from the class
    const customerIds = classData.customers?.map(c => c.customer).filter(Boolean) || []
    const companyIds = classData.customers?.map(c => c.company).filter(Boolean) || []
    const transactionIds = classData.customers?.map(c => c.transaction).filter(Boolean) || []

    // Batch fetch customers, companies, and transactions
    const [customers, companies, transactions] = await Promise.all([
      Customer.find({ _id: { $in: customerIds } }).select('name firstName lastName email phone dob').lean(),
      Company.find({ _id: { $in: companyIds } }).select('name email phone contactName').lean(),
      Transaction.find({ _id: { $in: transactionIds } }).lean()
    ])

    // Create lookup maps
    const customerMap = new Map(customers.map(c => [c._id.toString(), c]))
    const companyMap = new Map(companies.map(c => [c._id.toString(), c]))
    const transactionMap = new Map(transactions.map(t => [t._id.toString(), t]))

    // Get the main company booking (first transaction with a company)
    const mainTransaction = transactions.find(t => t.company)
    const mainCompany = mainTransaction?.company
      ? companyMap.get(mainTransaction.company.toString())
      : null

    // Build participants list with their details
    const participants = classData.customers?.map(customerEntry => {
      const customer = customerEntry.customer
        ? customerMap.get(customerEntry.customer.toString())
        : null
      const company = customerEntry.company
        ? companyMap.get(customerEntry.company.toString())
        : null
      const transaction = customerEntry.transaction
        ? transactionMap.get(customerEntry.transaction.toString())
        : null

      return {
        _id: customerEntry._id,
        customer,
        company,
        transactionId: customerEntry.transaction?.toString(),
        price: customerEntry.price,
        priceName: customerEntry.priceName,
        variation: customerEntry.variation,
        status: customerEntry.status,
        checkedIn: customerEntry.status === 'checked in',
        checkedInAt: customerEntry.checkedInAt
      }
    }) || []

    // Calculate total amount and qty
    const totalQty = participants.length
    let totalAmount = 0
    let totalAmountDue = 0

    transactions.forEach(t => {
      if (t.total) totalAmount += t.total
      if (t.invoiceAmountDue) totalAmountDue += t.invoiceAmountDue
    })

    // Get unique products from transactions
    const productDetails = []
    const seenProducts = new Set()

    for (const transaction of transactions) {
      for (const product of transaction.cart?.products || []) {
        const key = `${product._id}-${product.selectedVariationName || ''}`
        if (!seenProducts.has(key)) {
          seenProducts.add(key)
          productDetails.push({
            _id: product._id,
            name: product.name,
            type: product.type,
            variation: product.selectedVariationName || product.item?.variation,
            prices: product.prices,
            amount: product.amount,
            qty: product.qty || product.groupQty || 1,
            groupName: product.groupName,
            groupAmount: product.groupAmount,
            selectedTimes: product.selectedTimes,
            mods: product.item?.mods
          })
        }
      }
    }

    // Build the booking response
    const booking = {
      _id: classData._id,
      scheduleId: schedule._id,
      schedule: {
        _id: schedule._id,
        capacity: schedule.capacity,
        product: schedule.product
      },
      datetime: classData.datetime,
      duration: classData.duration,
      label: classData.label,
      company: mainCompany,
      companyPayment: mainTransaction?.companyPayment,
      participants,
      products: productDetails,
      totalQty,
      totalAmount,
      totalAmountDue,
      invoiceUrl: mainTransaction?.invoiceUrl,
      invoiceStatus: mainTransaction?.invoiceStatus,
      stripeInvoiceId: mainTransaction?.stripeInvoiceId,
      transactions: transactions.map(t => ({
        _id: t._id,
        total: t.total,
        status: t.status,
        invoiceStatus: t.invoiceStatus,
        invoiceAmountDue: t.invoiceAmountDue,
        invoiceUrl: t.invoiceUrl,
        createdAt: t.createdAt,
        bookingAdjustments: t.bookingAdjustments || []
      }))
    }

    return NextResponse.json(booking)

  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/bookings
 * Reschedule a booking to a new datetime and/or update duration and/or qty
 */
export async function PUT(req) {
  try {
    await connectDB()
    const { employee } = await getEmployee()
    const org = employee.org
    const orgId = org._id
    const locationId = employee.selectedLocationId

    const { scheduleId, oldDatetime, newDatetime, duration, newQty, pricePerParticipant } = await req.json()

    if (!scheduleId || !oldDatetime || !newDatetime) {
      return NextResponse.json({ error: 'scheduleId, oldDatetime, and newDatetime are required' }, { status: 400 })
    }

    // Find the schedule
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      org: orgId
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Find the location data
    const locationIndex = schedule.locations?.findIndex(
      loc => loc.location?.toString() === locationId?.toString()
    )

    if (locationIndex === -1) {
      return NextResponse.json({ error: 'Location not found in schedule' }, { status: 404 })
    }

    const locationData = schedule.locations[locationIndex]

    // Find the old class entry
    const oldClassIndex = locationData.classes?.findIndex(
      cls => new Date(cls.datetime).toISOString() === new Date(oldDatetime).toISOString()
    )

    if (oldClassIndex === -1) {
      return NextResponse.json({ error: 'Original class not found' }, { status: 404 })
    }

    const oldClass = locationData.classes[oldClassIndex]
    const customersToMove = oldClass.customers || []

    if (customersToMove.length === 0) {
      return NextResponse.json({ error: 'No customers to reschedule' }, { status: 400 })
    }

    // Check if datetime is actually changing
    const sameDateTime = new Date(oldDatetime).toISOString() === new Date(newDatetime).toISOString()

    // Use provided duration or keep existing
    const newDuration = duration || oldClass.duration
    const product = await Product.findById(schedule.product).lean()

    if (!sameDateTime) {
      // Check capacity at new datetime
      const newClassIndex = locationData.classes?.findIndex(
        cls => new Date(cls.datetime).toISOString() === new Date(newDatetime).toISOString()
      )

      let newClass
      if (newClassIndex === -1) {
        // Create new class entry for this datetime
        newClass = {
          datetime: new Date(newDatetime),
          available: schedule.capacity - customersToMove.length,
          customers: customersToMove,
          duration: newDuration,
          label: oldClass.label
        }
        schedule.locations[locationIndex].classes.push(newClass)
      } else {
        // Add to existing class
        newClass = locationData.classes[newClassIndex]
        const availableAfterMove = newClass.available - customersToMove.length

        if (availableAfterMove < 0) {
          return NextResponse.json({
            error: `Insufficient capacity at new time. Only ${newClass.available} spots available, but ${customersToMove.length} needed.`
          }, { status: 400 })
        }

        // Move customers to new class
        schedule.locations[locationIndex].classes[newClassIndex].customers.push(...customersToMove)
        schedule.locations[locationIndex].classes[newClassIndex].available = availableAfterMove

        // Update duration if provided
        if (duration) {
          schedule.locations[locationIndex].classes[newClassIndex].duration = newDuration
        }
      }

      // For open schedule products, remove the empty class entry entirely
      // For regular scheduled products, just clear customers and restore capacity
      if (product?.openSchedule) {
        // Remove the empty class entry for open schedule products
        schedule.locations[locationIndex].classes.splice(oldClassIndex, 1)
      } else {
        // Clear old class customers and restore capacity for regular schedules
        schedule.locations[locationIndex].classes[oldClassIndex].customers = []
        schedule.locations[locationIndex].classes[oldClassIndex].available = schedule.capacity
      }

      // Save schedule changes
      await schedule.save()
    }

    // Update transactions with new datetime (only if datetime changed)
    const transactionIds = customersToMove.map(c => c.transaction).filter(Boolean)

    if (!sameDateTime && transactionIds.length > 0) {
      // Update each transaction individually (some products may not have selectedTimes)
      const transactions = await Transaction.find({ _id: { $in: transactionIds } })

      for (const transaction of transactions) {
        let modified = false

        if (transaction.cart?.products) {
          for (const txProduct of transaction.cart.products) {
            if (txProduct.selectedTimes) {
              for (const selectedTime of txProduct.selectedTimes) {
                if (new Date(selectedTime.datetime).toISOString() === new Date(oldDatetime).toISOString()) {
                  selectedTime.datetime = new Date(newDatetime).toISOString()
                  // Update duration if provided
                  if (duration) {
                    selectedTime.duration = newDuration
                  }
                  modified = true
                }
              }
            }
          }
        }

        if (modified) {
          await transaction.save()
        }
      }
    }

    // Handle qty changes if newQty is provided and different from current
    const currentQty = customersToMove.length
    const qtyDiff = newQty !== undefined ? newQty - currentQty : 0

    if (qtyDiff !== 0 && pricePerParticipant !== undefined) {
      console.log('📊 Qty change detected:', { currentQty, newQty, qtyDiff, pricePerParticipant })

      // Find the main transaction (the one with the invoice)
      const mainTransaction = await Transaction.findOne({
        _id: { $in: transactionIds },
        stripeInvoiceId: { $exists: true, $ne: null }
      })

      if (mainTransaction && mainTransaction.stripeInvoiceId && org.stripeAccountId) {
        const differentialAmount = qtyDiff * pricePerParticipant

        console.log('💰 Differential amount for invoice:', differentialAmount)

        // Fetch the existing invoice from Stripe
        const invoice = await stripe.invoices.retrieve(
          mainTransaction.stripeInvoiceId,
          { stripeAccount: org.stripeAccountId }
        )

        console.log('📄 Current invoice status:', invoice.status)

        // Check if invoice can be updated
        if (invoice.status === 'paid' || invoice.status === 'void') {
          return NextResponse.json({
            error: `Cannot update invoice with status: ${invoice.status}. Booking time was updated but invoice could not be modified.`
          }, { status: 400 })
        }

        // If invoice is open (finalized), void it and create new one
        if (invoice.status === 'open') {
          console.log('🔄 Invoice is finalized - voiding and creating new invoice')

          const amountPaid = invoice.amount_paid || 0
          const originalInvoiceTotal = invoice.total / 100
          const newTotal = originalInvoiceTotal + differentialAmount
          const newTotalCents = Math.round(newTotal * 100)

          // Void the original invoice
          await stripe.invoices.voidInvoice(
            invoice.id,
            { stripeAccount: org.stripeAccountId }
          )

          console.log('✅ Voided original invoice:', invoice.id)

          // Create the new invoice
          const newInvoice = await stripe.invoices.create({
            customer: invoice.customer,
            auto_advance: false,
            collection_method: 'send_invoice',
            days_until_due: invoice.days_until_due || 30,
            metadata: {
              originalInvoiceId: invoice.id,
              transactionId: mainTransaction._id.toString(),
              voidedInvoiceId: invoice.id
            },
            description: `Revised invoice (replaces ${invoice.number || invoice.id})`,
            footer: invoice.footer
          }, {
            stripeAccount: org.stripeAccountId
          })

          // Add invoice item for new total
          await stripe.invoiceItems.create({
            customer: invoice.customer,
            invoice: newInvoice.id,
            amount: newTotalCents,
            currency: invoice.currency,
            description: `Adjusted booking (${newQty} participants)`,
            metadata: {
              transactionId: mainTransaction._id.toString(),
              adjustmentType: 'booking_qty_change'
            }
          }, {
            stripeAccount: org.stripeAccountId
          })

          // If there was a payment on the old invoice, create credit note
          if (amountPaid > 0) {
            await stripe.creditNotes.create({
              invoice: invoice.id,
              lines: [{
                type: 'custom_line_item',
                description: 'Payment transferred to revised invoice',
                amount: amountPaid,
                unit_amount: amountPaid,
                quantity: 1
              }],
              memo: `Credit applied to revised invoice ${newInvoice.number || newInvoice.id}`,
              metadata: {
                newInvoiceId: newInvoice.id,
                transactionId: mainTransaction._id.toString()
              }
            }, {
              stripeAccount: org.stripeAccountId
            })
          }

          // Finalize and send the new invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            newInvoice.id,
            { auto_advance: true },
            { stripeAccount: org.stripeAccountId }
          )

          // Update transaction with new invoice info and record adjustment
          // Use native MongoDB to bypass Mongoose schema casting issues
          await Transaction.collection.updateOne(
            { _id: mainTransaction._id },
            {
              $set: {
                stripeInvoiceId: finalizedInvoice.id,
                invoiceUrl: finalizedInvoice.hosted_invoice_url,
                invoiceStatus: finalizedInvoice.status,
                invoiceAmountDue: finalizedInvoice.amount_due / 100,
                invoiceAmountPaid: finalizedInvoice.amount_paid / 100,
                total: newTotal,
                voidedInvoiceId: invoice.id
              },
              $push: {
                bookingAdjustments: {
                  date: new Date(),
                  type: qtyDiff > 0 ? 'qty_increase' : 'qty_decrease',
                  previousQty: currentQty,
                  newQty: newQty,
                  amount: differentialAmount,
                  previousTotal: originalInvoiceTotal,
                  newTotal: newTotal,
                  employeeId: employee._id,
                  voidedInvoiceId: invoice.id,
                  newInvoiceId: finalizedInvoice.id,
                  note: `Participant qty changed from ${currentQty} to ${newQty}`
                }
              }
            }
          )

          console.log('✅ Invoice updated successfully')
        } else if (invoice.status === 'draft') {
          // For draft invoices, just add a line item
          const description = differentialAmount > 0
            ? `Additional participant (${newQty} total)`
            : `Removed participant (${newQty} total)`

          await stripe.invoiceItems.create({
            customer: invoice.customer,
            invoice: invoice.id,
            amount: Math.round(differentialAmount * 100),
            currency: 'usd',
            description: description
          }, {
            stripeAccount: org.stripeAccountId
          })

          // Finalize the invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id,
            { auto_advance: true },
            { stripeAccount: org.stripeAccountId }
          )

          const originalTotal = mainTransaction.total || 0
          // Use native MongoDB to bypass Mongoose schema casting issues
          await Transaction.collection.updateOne(
            { _id: mainTransaction._id },
            {
              $set: {
                invoiceAmountDue: finalizedInvoice.amount_due / 100,
                total: finalizedInvoice.total / 100,
                invoiceStatus: finalizedInvoice.status
              },
              $push: {
                bookingAdjustments: {
                  date: new Date(),
                  type: qtyDiff > 0 ? 'qty_increase' : 'qty_decrease',
                  previousQty: currentQty,
                  newQty: newQty,
                  amount: differentialAmount,
                  previousTotal: originalTotal,
                  newTotal: finalizedInvoice.total / 100,
                  employeeId: employee._id,
                  note: `Participant qty changed from ${currentQty} to ${newQty}`
                }
              }
            }
          )
        }

        // Update schedule class with new qty (add/remove participant entries)
        // Find the new class we just created/updated
        const updatedSchedule = await Schedule.findById(scheduleId)
        const updatedLocationData = updatedSchedule.locations.find(
          loc => loc.location?.toString() === locationId?.toString()
        )
        const targetClassIndex = updatedLocationData?.classes?.findIndex(
          cls => new Date(cls.datetime).toISOString() === new Date(newDatetime).toISOString()
        )

        if (targetClassIndex !== -1 && updatedLocationData) {
          const targetClass = updatedLocationData.classes[targetClassIndex]

          if (qtyDiff > 0) {
            // Adding participants - create placeholder entries
            for (let i = 0; i < qtyDiff; i++) {
              targetClass.customers.push({
                transaction: mainTransaction._id,
                company: mainTransaction.company,
                status: 'pending_waiver'
              })
            }
            targetClass.available = Math.max(0, (targetClass.available || 0) - qtyDiff)
          } else if (qtyDiff < 0) {
            // Removing participants - remove from the end
            const toRemove = Math.abs(qtyDiff)
            targetClass.customers.splice(-toRemove, toRemove)
            targetClass.available = (targetClass.available || 0) + toRemove
          }

          await updatedSchedule.save()
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      newDatetime: new Date(newDatetime).toISOString(),
      qtyChanged: qtyDiff !== 0
    })

  } catch (error) {
    console.error('Error rescheduling booking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/bookings
 * Cancel a booking - frees up time slots, voids invoice, cancels orders
 */
export async function DELETE(req) {
  try {
    await connectDB()
    const { employee } = await getEmployee()
    const org = employee.org
    const orgId = org._id
    const locationId = employee.selectedLocationId

    const { scheduleId, datetime } = await req.json()

    if (!scheduleId || !datetime) {
      return NextResponse.json({ error: 'scheduleId and datetime are required' }, { status: 400 })
    }

    // Find the schedule
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      org: orgId
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Find the location data
    const locationIndex = schedule.locations?.findIndex(
      loc => loc.location?.toString() === locationId?.toString()
    )

    if (locationIndex === -1) {
      return NextResponse.json({ error: 'Location not found in schedule' }, { status: 404 })
    }

    const locationData = schedule.locations[locationIndex]

    // Find the class entry
    const classIndex = locationData.classes?.findIndex(
      cls => new Date(cls.datetime).toISOString() === new Date(datetime).toISOString()
    )

    if (classIndex === -1) {
      return NextResponse.json({ error: 'Class not found for the specified datetime' }, { status: 404 })
    }

    const classData = locationData.classes[classIndex]
    const customersToRemove = classData.customers || []

    if (customersToRemove.length === 0) {
      return NextResponse.json({ error: 'No booking found to cancel' }, { status: 400 })
    }

    // Collect transaction IDs
    const transactionIds = [...new Set(customersToRemove.map(c => c.transaction?.toString()).filter(Boolean))]

    // 1. Void invoices on Stripe and update transactions
    const transactions = await Transaction.find({ _id: { $in: transactionIds } })

    for (const transaction of transactions) {
      // Void Stripe invoice if exists
      if (transaction.stripeInvoiceId && org.stripeAccountId) {
        try {
          const invoice = await stripe.invoices.retrieve(
            transaction.stripeInvoiceId,
            { stripeAccount: org.stripeAccountId }
          )

          // Only void if invoice is open (not paid or already voided)
          if (invoice.status === 'open' || invoice.status === 'draft') {
            await stripe.invoices.voidInvoice(
              transaction.stripeInvoiceId,
              { stripeAccount: org.stripeAccountId }
            )
            console.log('✅ Voided invoice:', transaction.stripeInvoiceId)
          }
        } catch (stripeError) {
          console.error('Error voiding invoice:', stripeError.message)
          // Continue even if Stripe fails - still clean up locally
        }
      }

      // Update transaction status
      await Transaction.updateOne(
        { _id: transaction._id },
        {
          $set: {
            status: 'cancelled',
            invoiceStatus: 'void',
            invoiceAmountDue: 0
          }
        }
      )
    }

    // 2. Cancel any associated orders (bump queue)
    await Order.updateMany(
      { transaction: { $in: transactionIds } },
      { $set: { status: 'cancelled' } }
    )

    const cancelledOrdersCount = await Order.countDocuments({
      transaction: { $in: transactionIds },
      status: 'cancelled'
    })
    console.log(`✅ Cancelled ${cancelledOrdersCount} orders`)

    // 3. Free up time slots - check if product is openSchedule
    const product = await Product.findById(schedule.product).lean()

    if (product?.openSchedule) {
      // For open schedule products, remove the class entry entirely
      schedule.locations[locationIndex].classes.splice(classIndex, 1)
    } else {
      // For regular scheduled products, clear customers and restore capacity
      schedule.locations[locationIndex].classes[classIndex].customers = []
      schedule.locations[locationIndex].classes[classIndex].available = schedule.capacity
    }

    await schedule.save()
    console.log('✅ Freed up time slots')

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      cancelledTransactions: transactionIds.length,
      cancelledOrders: cancelledOrdersCount
    })

  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
