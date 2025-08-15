import { NextResponse } from 'next/server';
import { getCustomer } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Schedule } from '@/models';

export async function GET(request) {
  try {
    await connectDB();
    
    // Authenticate the customer
    const { customer } = await getCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== CUSTOMER SCHEDULES API DEBUG ===');
    console.log('Customer ID:', customer._id);
    console.log('Customer Name:', customer.name);
    
    // Get current date for filtering upcoming classes
    const now = new Date();
    
    // Find all schedules where the customer is enrolled
    const schedules = await Schedule.find({
      'locations.classes.customers.customer': customer._id,
      // Only get schedules with classes in the future
      'locations.classes.datetime': { $gte: now }
    })
    .populate('product')
    .populate('locations.location')
    .sort({ 'locations.classes.datetime': 1 })
    .lean();

    console.log('Found schedules:', schedules.length);

    // Extract and format upcoming classes/courses for the customer
    const upcomingClasses = [];
    
    for (const schedule of schedules) {
      for (const location of schedule.locations || []) {
        for (const classItem of location.classes || []) {
          // Check if class is in the future
          if (new Date(classItem.datetime) < now) continue;
          
          // Check if customer is enrolled in this class
          const customerEnrollment = classItem.customers?.find(
            c => c.customer?.toString() === customer._id.toString()
          );
          
          if (customerEnrollment && customerEnrollment.status !== 'cancelled') {
            upcomingClasses.push({
              _id: classItem._id,
              scheduleId: schedule._id,
              datetime: classItem.datetime,
              duration: classItem.duration,
              status: customerEnrollment.status,
              product: {
                _id: schedule.product?._id,
                name: schedule.product?.name,
                type: schedule.product?.type,
                description: schedule.product?.desc,
                duration: schedule.product?.duration, // Include the full duration object
                thumbnail: schedule.product?.thumbnail // Include the thumbnail
              },
              location: {
                _id: location.location?._id,
                name: location.location?.name,
                address: location.location?.address
              },
              available: classItem.available,
              capacity: schedule.capacity
            });
          }
        }
      }
    }

    // Sort by datetime
    upcomingClasses.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    console.log('Upcoming classes found:', upcomingClasses.length);
    if (upcomingClasses.length > 0) {
      console.log('Next class:', {
        name: upcomingClasses[0].product?.name,
        datetime: upcomingClasses[0].datetime,
        location: upcomingClasses[0].location?.name
      });
    }
    console.log('============================');

    return NextResponse.json({
      success: true,
      schedules: upcomingClasses,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        memberId: customer.memberId
      }
    });
    
  } catch (error) {
    console.error('Error fetching customer schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}