import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Checkin, Customer, Product } from '@/models'
import { getEmployee } from '@/lib/auth'
import dayjs from 'dayjs'

export async function GET(request) {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('dateFilter') || 'today'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''
    const method = searchParams.get('method') || ''
    const successFilter = searchParams.get('success') || ''
    
    // Build date query based on filter
    let dateQuery = {}
    const now = new Date()
    
    switch (dateFilter) {
      case 'today':
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        dateQuery = { createdAt: { $gte: startOfDay, $lte: endOfDay } }
        break
      case 'week':
        const startOfWeek = dayjs().startOf('week').toDate()
        const endOfWeek = dayjs().endOf('week').toDate()
        dateQuery = { createdAt: { $gte: startOfWeek, $lte: endOfWeek } }
        break
      case 'month':
        const startOfMonth = dayjs().startOf('month').toDate()
        const endOfMonth = dayjs().endOf('month').toDate()
        dateQuery = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
        break
      case 'all':
      default:
        // No date filter
        break
    }
    
    // Build search query
    let searchQuery = {}
    if (search) {
      // Build customer search conditions
      const customerConditions = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
      
      // Add memberId search if the search term is a number
      if (!isNaN(search)) {
        customerConditions.push({ memberId: parseInt(search) })
      }
      
      // Find matching customers
      const customers = await Customer.find({
        $or: customerConditions
      }).select('_id')
      
      // Find matching products
      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id')
      
      const customerIds = customers.map(c => c._id)
      const productIds = products.map(p => p._id)
      
      if (customerIds.length > 0 || productIds.length > 0) {
        searchQuery = {
          $or: [
            ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : []),
            ...(productIds.length > 0 ? [{ product: { $in: productIds } }] : [])
          ]
        }
      } else {
        // If no matches found, ensure no results are returned
        searchQuery = { _id: null }
      }
    }
    
    // Build method query
    let methodQuery = {}
    if (method) {
      methodQuery = { method }
    }
    
    // Build success query
    let successQuery = {}
    if (successFilter === 'success') {
      // Show only successful check-ins (default behavior for backward compatibility)
      successQuery = { 
        $or: [
          { 'success.status': true },
          { 'success.status': { $exists: false } } // Handle old records without success field
        ]
      }
    } else if (successFilter === 'failed') {
      // Show only failed check-ins
      successQuery = { 'success.status': false }
    }
    // If 'all', no filter needed
    
    // Combine all queries
    const query = {
      org: employee.org._id,
      ...dateQuery,
      ...searchQuery,
      ...methodQuery,
      ...successQuery
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Get total count for pagination
    const totalCount = await Checkin.countDocuments(query)
    const totalPages = Math.ceil(totalCount / limit)
    
    // Fetch paginated checkins with populated references
    const checkins = await Checkin.find(query)
    .populate('customer', 'name email memberId photo')
    .populate('product', 'name type')
    .populate('schedule')
    .populate('class.location', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    
    // Calculate stats
    const stats = {
      totalToday: 0,
      qrCode: 0,
      manual: 0,
      staff: 0,
      classCheckins: 0,
      membershipCheckins: 0
    }
    
    // Get today's checkins for stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    const todayCheckins = await Checkin.find({
      org: employee.org._id,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    })
    
    todayCheckins.forEach(checkin => {
      stats.totalToday++
      
      // Count by method
      if (checkin.method === 'qr-code') stats.qrCode++
      else if (checkin.method === 'manual') stats.manual++
      else if (checkin.method === 'staff') stats.staff++
      
      // Count by type (class vs membership)
      if (checkin.schedule) {
        stats.classCheckins++
      } else {
        stats.membershipCheckins++
      }
    })
    
    return NextResponse.json({ 
      checkins,
      stats,
      totalCount,
      totalPages,
      currentPage: page
    })
    
  } catch (error) {
    console.error('Error fetching checkins:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch checkins',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE method to remove a checkin (if needed for admin purposes)
export async function DELETE(request) {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const checkinId = searchParams.get('id')
    
    if (!checkinId) {
      return NextResponse.json({ error: 'Checkin ID required' }, { status: 400 })
    }
    
    const result = await Checkin.findOneAndDelete({
      _id: checkinId,
      org: employee.org._id
    })
    
    if (!result) {
      return NextResponse.json({ error: 'Checkin not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Checkin deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting checkin:', error)
    return NextResponse.json({ 
      error: 'Failed to delete checkin',
      details: error.message 
    }, { status: 500 })
  }
}