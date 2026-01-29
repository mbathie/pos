import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule, Company } from "@/models"

/**
 * GET /api/calendar?month=2025-01
 * Fetch all scheduled classes/courses for a given month
 */
export async function GET(req) {
  try {
    await connectDB()
    const { employee } = await getEmployee()
    const orgId = employee.org._id
    const locationId = employee.selectedLocationId

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // Format: YYYY-MM

    // Parse month parameter or default to current month
    let startDate, endDate
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59) // Last day of month
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    // Fetch all schedules for the org
    const schedules = await Schedule.find({ org: orgId })
      .populate('product', 'name type thumbnail color')
      .lean()

    // Extract classes within the date range for the selected location
    // First pass: collect all company IDs for batch lookup
    const companyIds = new Set()
    const eventsData = []

    for (const schedule of schedules) {
      const locationData = schedule.locations?.find(
        loc => loc.location?.toString() === locationId?.toString()
      )

      if (!locationData?.classes) continue

      for (const cls of locationData.classes) {
        const classDate = new Date(cls.datetime)

        // Check if within date range
        if (classDate >= startDate && classDate <= endDate) {
          // Check if this is a group booking (has company on first customer)
          const firstCustomerWithCompany = cls.customers?.find(c => c.company)
          if (firstCustomerWithCompany?.company) {
            companyIds.add(firstCustomerWithCompany.company.toString())
          }

          eventsData.push({
            cls,
            schedule,
            companyId: firstCustomerWithCompany?.company?.toString()
          })
        }
      }
    }

    // Batch fetch all companies
    const companies = companyIds.size > 0
      ? await Company.find({ _id: { $in: Array.from(companyIds) } }).select('name').lean()
      : []
    const companyMap = new Map(companies.map(c => [c._id.toString(), c.name]))

    // Build events with company names
    const events = eventsData.map(({ cls, schedule, companyId }) => ({
      _id: cls._id || `${schedule._id}-${cls.datetime}`,
      scheduleId: schedule._id,
      datetime: cls.datetime,
      duration: cls.duration,
      label: cls.label,
      available: cls.available,
      capacity: schedule.capacity,
      customerCount: cls.customers?.length || 0,
      companyId: companyId || null,
      companyName: companyId ? companyMap.get(companyId) : null,
      product: {
        _id: schedule.product?._id,
        name: schedule.product?.name,
        type: schedule.product?.type,
        thumbnail: schedule.product?.thumbnail,
        color: schedule.product?.color
      }
    }))

    // Sort by datetime
    events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))

    return NextResponse.json({
      events,
      month: monthParam || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
    })

  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
