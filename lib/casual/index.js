import { connectDB } from "@/lib/mongoose"
import { General, Customer } from '@/models'

export async function addToCasual({cart, employee, transaction}) {
  await connectDB()

  for (const product of cart.products) {
    if (!['casual'].includes(product.type)) continue

    const now = new Date()

    // Get the duration from item data (selected variation)
    const durationAmount = parseFloat(product.item?.variation) || 1
    const durationUnit = product.item?.unit || 'hour'

    let hours = durationAmount
    if (durationUnit === 'day') hours = durationAmount * 24
    if (durationUnit === 'minute') hours = durationAmount / 60

    const end = new Date(now.getTime() + hours * 60 * 60 * 1000)

    // Use the new prices format at product level
    for (const pr of product.prices || []) {
      for (const c of pr.customers || []) {
        if (!c.customer?._id) continue;

        await Customer.updateOne(
          { _id: c.customer._id },
          { $set: { assigned: true } }
        )

        await General.create({
          start: now,
          end,
          hours,
          product: product._id,
          customer: c.customer._id,
          location: cart.location._id,
          org: employee.org,
          transaction: transaction._id
        })
      }
    }
  }
}
