import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule, Company, Transaction } from "@/models"

/**
 * GET /api/bookings/list
 * List all bookings for classes and courses
 */
export async function GET(req) {
  try {
    await connectDB()
    const { employee } = await getEmployee()
    const orgId = employee.org._id
    const locationId = employee.selectedLocationId

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all' // 'all', 'upcoming', 'past'
    const companyId = searchParams.get('companyId')
    const productId = searchParams.get('productId')

    // Find all schedules for this org
    const query = { org: orgId }
    if (productId) {
      query.product = productId
    }

    const schedules = await Schedule.find(query)
      .populate('product', 'name type thumbnail')
      .lean()

    const now = new Date()
    const bookings = []

    // Collect all company IDs first for batch lookup
    const companyIds = new Set()
    const transactionIds = new Set()

    for (const schedule of schedules) {
      const locationData = schedule.locations?.find(
        loc => loc.location?.toString() === locationId?.toString()
      )
      if (!locationData?.classes) continue

      for (const classEntry of locationData.classes) {
        if (!classEntry.customers || classEntry.customers.length === 0) continue

        // Collect IDs for batch lookup
        for (const customer of classEntry.customers) {
          if (customer.company) companyIds.add(customer.company.toString())
          if (customer.transaction) transactionIds.add(customer.transaction.toString())
        }
      }
    }

    // Batch fetch companies and transactions
    const [companies, transactions] = await Promise.all([
      Company.find({ _id: { $in: Array.from(companyIds) } }).select('name').lean(),
      Transaction.find({ _id: { $in: Array.from(transactionIds) } })
        .select('invoiceStatus invoiceAmountDue total companyPayment')
        .lean()
    ])

    const companyMap = new Map(companies.map(c => [c._id.toString(), c]))
    const transactionMap = new Map(transactions.map(t => [t._id.toString(), t]))

    // Process schedules to extract bookings
    for (const schedule of schedules) {
      const locationData = schedule.locations?.find(
        loc => loc.location?.toString() === locationId?.toString()
      )
      if (!locationData?.classes) continue

      for (const classEntry of locationData.classes) {
        if (!classEntry.customers || classEntry.customers.length === 0) continue

        const classDatetime = new Date(classEntry.datetime)
        const isPast = classDatetime < now

        // Apply time filter
        if (filter === 'upcoming' && isPast) continue
        if (filter === 'past' && !isPast) continue

        // Group customers by company/transaction to create booking entries
        const bookingGroups = new Map()

        for (const customer of classEntry.customers) {
          // Group by company or transaction
          const groupKey = customer.company?.toString() ||
                          customer.transaction?.toString() ||
                          'individual'

          if (!bookingGroups.has(groupKey)) {
            bookingGroups.set(groupKey, {
              company: customer.company ? companyMap.get(customer.company.toString()) : null,
              transaction: customer.transaction ? transactionMap.get(customer.transaction.toString()) : null,
              customers: []
            })
          }
          bookingGroups.get(groupKey).customers.push(customer)
        }

        // Create booking entries for each group
        for (const [groupKey, group] of bookingGroups) {
          // Apply company filter if specified
          if (companyId && group.company?._id?.toString() !== companyId) continue

          const companyName = group.transaction?.companyPayment?.companyName ||
                             group.company?.name ||
                             'Individual'

          bookings.push({
            scheduleId: schedule._id,
            datetime: classEntry.datetime,
            label: classEntry.label,
            duration: classEntry.duration,
            product: schedule.product,
            company: group.company,
            companyName,
            transactionId: group.transaction?._id,
            invoiceStatus: group.transaction?.invoiceStatus,
            invoiceAmountDue: group.transaction?.invoiceAmountDue,
            total: group.transaction?.total,
            participantCount: group.customers.length,
            capacity: schedule.capacity,
            isPast
          })
        }
      }
    }

    // Sort bookings by datetime (upcoming first, then past in reverse)
    bookings.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1
      return a.isPast
        ? new Date(b.datetime) - new Date(a.datetime)
        : new Date(a.datetime) - new Date(b.datetime)
    })

    return NextResponse.json(bookings)

  } catch (error) {
    console.error('Error fetching bookings list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
