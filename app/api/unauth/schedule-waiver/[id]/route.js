import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Org, Transaction, Customer, Schedule } from "@/models";

/**
 * GET /api/unauth/schedule-waiver/[id]
 * Fetch schedule and org info for the waiver link
 * [id] is the transaction ID that contains the schedule purchase
 */
export async function GET(req, { params }) {
  await connectDB();

  const { id } = await params;

  console.log('📋 Fetching schedule waiver info for transaction:', id);

  try {
    // Find the transaction
    const transaction = await Transaction.findById(id)
      .populate('company')
      .populate('org')
      .lean();

    console.log('📋 Transaction found:', transaction ? 'Yes' : 'No');
    if (transaction) {
      console.log('📋 Has companyPayment:', !!transaction.companyPayment);
      console.log('📋 Has company:', !!transaction.company);
      console.log('📋 Org populated:', !!transaction.org?.name);
    }

    if (!transaction) {
      return NextResponse.json(
        { message: 'Invalid waiver link' },
        { status: 404 }
      );
    }

    // Check if this is a company transaction
    if (!transaction.companyPayment || !transaction.company) {
      return NextResponse.json(
        { message: 'This link is not for a company purchase' },
        { status: 400 }
      );
    }

    // Extract schedule info from transaction cart
    // The cart should contain the product (schedule) details
    let scheduleInfo = {
      productName: 'Class/Course',
      companyName: transaction.companyPayment.companyName,
      datetime: null,
      timeLabel: null,
    };

    // Try to get product name and schedule time from cart
    if (transaction.cart?.products?.length > 0) {
      const firstProduct = transaction.cart.products[0];
      scheduleInfo.productName = firstProduct.name || scheduleInfo.productName;

      // Extract datetime from selectedTimes if available
      if (firstProduct.selectedTimes?.length > 0) {
        const selectedTime = firstProduct.selectedTimes[0];
        scheduleInfo.datetime = selectedTime.datetime;
        scheduleInfo.timeLabel = selectedTime.time; // e.g., "3:30 PM"
        if (selectedTime.label) {
          scheduleInfo.classLabel = selectedTime.label; // e.g., "Morning", "Arvo"
        }
      }
    }

    return NextResponse.json({
      org: {
        _id: transaction.org._id,
        name: transaction.org.name,
        waiverContent: transaction.org.waiverContent,
      },
      scheduleInfo,
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error fetching schedule waiver info:', error);
    return NextResponse.json(
      { message: 'Failed to load waiver information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unauth/schedule-waiver/[id]
 * Submit waiver and link customer to schedule
 */
export async function POST(req, { params }) {
  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const { customer, address, dependents, waiverReviewed, agree, org } = body;

  try {
    // Find the transaction
    const transaction = await Transaction.findById(id)
      .populate('company')
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { error: 'Invalid waiver link', field: null },
        { status: 404 }
      );
    }

    // Check if this is a company transaction
    if (!transaction.companyPayment || !transaction.company) {
      return NextResponse.json(
        { error: 'This link is not for a company purchase', field: null },
        { status: 400 }
      );
    }

    // Check if email already exists for this org
    const existingCustomer = await Customer.findOne({
      email: customer.email,
      orgs: transaction.org
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'A customer with this email already exists', field: 'email' },
        { status: 400 }
      );
    }

    // Create the customer
    const newCustomer = await Customer.create({
      ...customer,
      ...address,
      orgs: [transaction.org], // Use 'orgs' array to match customer schema
      waiverReviewed,
      agree,
      dependents: dependents || [],
      active: true,
    });

    // Link customer to schedule if this is a class/course purchase
    const product = transaction.cart?.products?.[0];
    const selectedTime = product?.selectedTimes?.[0];

    if (product && ['class', 'course'].includes(product.type) && selectedTime?.datetime) {
      try {
        // Query for schedule by product ID (it may have been created after transaction)
        const schedule = await Schedule.findOne({
          product: product._id,
          org: transaction.org
        });

        if (schedule) {
          console.log('🔍 Found schedule for customer linking:', schedule._id);

          // Find the location
          const locationIndex = schedule.locations.findIndex(
            loc => loc.location.toString() === transaction.location.toString()
          );

          if (locationIndex !== -1) {
            console.log('🔍 Found location at index:', locationIndex);

            // Find the class by datetime
            const classDatetime = new Date(selectedTime.datetime).getTime();
            const classIndex = schedule.locations[locationIndex].classes.findIndex(
              cls => new Date(cls.datetime).getTime() === classDatetime
            );

            if (classIndex !== -1) {
              console.log('🔍 Found class at index:', classIndex);
              // Find placeholder customer for this transaction
              const placeholderIndex = schedule.locations[locationIndex].classes[classIndex].customers.findIndex(
                c => c.isPlaceholder && c.transaction.toString() === transaction._id.toString()
              );

              if (placeholderIndex !== -1) {
                // Replace placeholder with real customer
                schedule.locations[locationIndex].classes[classIndex].customers[placeholderIndex] = {
                  customer: newCustomer._id,
                  status: 'confirmed',
                  transaction: transaction._id
                };

                console.log('✅ Replaced placeholder with real customer:', {
                  customerId: newCustomer._id,
                  scheduleId: schedule._id,
                  locationIndex,
                  classIndex,
                  placeholderIndex
                });
              } else {
                // Fallback: No placeholder found, add customer normally
                // This shouldn't happen but provides safety
                console.warn('⚠️ No placeholder found for transaction, adding customer normally:', transaction._id);

                schedule.locations[locationIndex].classes[classIndex].customers.push({
                  customer: newCustomer._id,
                  status: 'confirmed',
                  transaction: transaction._id
                });

                // Decrement available spots (only in fallback case)
                if (schedule.locations[locationIndex].classes[classIndex].available > 0) {
                  schedule.locations[locationIndex].classes[classIndex].available -= 1;
                }
              }

              await schedule.save();

              console.log('✅ Customer linked to schedule:', {
                customerId: newCustomer._id,
                scheduleId: schedule._id,
                locationIndex,
                classIndex,
              });
            } else {
              console.warn('⚠️ Class not found in schedule for datetime:', selectedTime.datetime);
            }
          } else {
            console.warn('⚠️ Location not found in schedule:', transaction.location);
          }
        } else {
          console.warn('⚠️ Schedule not found for product:', product._id);
        }
      } catch (error) {
        console.error('❌ Error linking customer to schedule:', error);
        // Don't fail the whole operation if schedule linking fails
      }
    } else {
      console.log('ℹ️ Not a class/course purchase or missing selectedTime, skipping schedule linking');
    }

    console.log('✅ Customer created for company waiver:', {
      customerId: newCustomer._id,
      transactionId: transaction._id,
      company: transaction.company.name,
    });

    return NextResponse.json({
      success: true,
      customer: newCustomer
    }, { status: 200 });

  } catch (error) {
    console.error('Error submitting schedule waiver:', error);
    return NextResponse.json(
      { error: 'Failed to submit waiver', field: null },
      { status: 500 }
    );
  }
}
