import { connectDB } from "@/lib/mongoose"
import { Casual, Customer } from '@/models'

export async function addToCasual({cart, employee, transaction}) {
  await connectDB()

  for (const product of cart.products) {
    if (!['casual'].includes(product.type)) continue

    const now = new Date()

    for (const v of product.variations || []) {
      const durationAmount = parseFloat(v.name) || 1
      const durationUnit = v.unit

      let hours = durationAmount
      if (durationUnit === 'day') hours = durationAmount * 24
      if (durationUnit === 'minute') hours = durationAmount / 60

      const end = new Date(now.getTime() + hours * 60 * 60 * 1000)

      for (const pr of v.prices || []) {
        for (const c of pr.customers || []) {
          if (!c.customer?._id) continue;

          await Customer.updateOne(
            { _id: c.customer._id },
            { $set: { assigned: true } }
          )

          await Casual.create({
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
}
