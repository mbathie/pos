import { connectDB } from "@/lib/mongoose"
import { General, Customer } from '@/models'

export async function addToGeneral({cart, employee, transaction}) {
  console.log('🔵 addToGeneral called with:', {
    cartProducts: cart.products?.length,
    employeeOrg: employee?.org,
    transactionId: transaction?._id
  })
  
  await connectDB()

  for (const product of cart.products) {
    console.log('🔍 Processing product:', {
      name: product.name,
      type: product.type,
      _id: product._id,
      prices: product.prices
    })
    
    if (!['casual', 'general'].includes(product.type)) {
      console.log(`⏭️ Skipping product ${product.name} - type ${product.type} not casual/general`)
      continue
    }

    console.log(`✅ Product ${product.name} is type ${product.type} - processing...`)

    const now = new Date()
    let end = now
    let hours = 0

    // For casual products, calculate duration
    if (product.type === 'casual') {
      // Get the duration from item data (selected variation)
      const durationAmount = parseFloat(product.item?.variation) || 1
      const durationUnit = product.item?.unit || 'hour'

      hours = durationAmount
      if (durationUnit === 'day') hours = durationAmount * 24
      if (durationUnit === 'minute') hours = durationAmount / 60

      end = new Date(now.getTime() + hours * 60 * 60 * 1000)
      console.log('📅 Casual product duration calculated:', { hours, end })
    } else {
      console.log('📅 General product - no duration')
    }

    // Use the new prices format at product level
    console.log('💰 Processing prices:', product.prices?.length || 0, 'price entries')
    
    for (const pr of product.prices || []) {
      console.log('  💵 Price entry:', {
        name: pr.name,
        value: pr.value,
        qty: pr.qty,
        customers: pr.customers?.length || 0
      })
      
      for (const c of pr.customers || []) {
        console.log('    👤 Customer in price:', {
          customerId: c.customer?._id,
          customerName: c.customer?.name,
          hasId: !!c.customer?._id
        })
        
        if (!c.customer?._id) {
          console.log('    ⚠️ No customer ID found, skipping')
          continue;
        }

        console.log('    ✅ Updating customer assigned status...')
        await Customer.updateOne(
          { _id: c.customer._id },
          { $set: { assigned: true } }
        )

        const generalData = {
          start: now,
          end: product.type === 'general' ? null : end,
          hours: product.type === 'general' ? null : hours,
          product: product._id,
          customer: c.customer._id,
          location: employee.selectedLocationId || cart.location?._id,
          org: employee.org,
          transaction: transaction._id
        }
        
        console.log('    📝 Creating General entry with data:', generalData)
        
        try {
          const created = await General.create(generalData)
          console.log('    ✅ General entry created successfully:', created._id)
        } catch (error) {
          console.error('    ❌ Error creating General entry:', error)
        }
      }
    }
  }
  
  console.log('🔵 addToGeneral completed')
}
