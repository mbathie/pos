import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Schedule, Customer, Product, Checkin, Membership } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    // Get employee from session
    const { employee } = await getEmployee();
    
    console.log('Check-in API called');
    console.log('Employee:', employee?.name, 'Org:', employee?.org?._id);
    
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { customerId, test = false } = await request.json();
    
    console.log('QR code data received:', customerId);
    console.log('Test mode:', test);
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }
    
    // Parse the QR code data - should be plain text memberId
    let customer;
    
    // Convert to string and trim any whitespace
    const memberIdStr = String(customerId).trim();
    console.log('Processing memberId:', memberIdStr);
    
    // Validate it's a valid numeric string (only digits)
    if (!/^\d+$/.test(memberIdStr)) {
      return NextResponse.json({ 
        error: 'Invalid QR code format. Expected numeric member ID.',
        received: memberIdStr
      }, { status: 400 });
    }
    
    // Convert to number
    const memberId = parseInt(memberIdStr, 10);
    
    // Find customer by memberId
    // First try to find by memberId and org
    customer = await Customer.findOne({ 
      memberId: memberId,
      orgs: employee.org._id 
    });
    
    // If not found in this org, find by memberId alone (customer might belong to multiple orgs)
    if (!customer) {
      customer = await Customer.findOne({ 
        memberId: memberId
      });
      
      // Verify customer belongs to this org
      if (customer && customer.orgs) {
        const belongsToOrg = customer.orgs.some(orgId => 
          orgId.toString() === employee.org._id.toString()
        );
        if (!belongsToOrg) {
          console.log('Customer found but not in this org:', customer.name);
          customer = null; // Reset if not in org
        }
      }
    }
    
    console.log('Customer found by memberId:', customer ? customer.name : 'Not found');
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    // Get current time and time window (30 minutes before and after)
    const now = new Date();
    const thirtyMinutesBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const thirtyMinutesAfter = new Date(now.getTime() + 30 * 60 * 1000);
    
    // Search for schedules with this customer
    console.log('Searching schedules for org:', employee.org._id, 'and customer:', customer._id);
    
    // In test mode, find any schedule with this customer regardless of status
    const searchQuery = test ? {
      org: employee.org._id,
      'locations.classes.customers.customer': customer._id
    } : {
      org: employee.org._id,
      // Look for classes where customer is in the customers array with status 'confirmed'
      'locations.classes.customers': {
        $elemMatch: {
          customer: customer._id,
          status: 'confirmed'
        }
      }
    };
    
    const schedules = await Schedule.find(searchQuery).populate('product');
    
    console.log('Schedules found:', schedules?.length || 0);
    
    if (!schedules || schedules.length === 0) {
      // Also try searching for any schedule with this customer to debug
      const anySchedule = await Schedule.findOne({
        'locations.classes.customers.customer': customer._id
      });
      console.log('Any schedule with customer:', anySchedule ? 'Found' : 'Not found');
      
      // Check for active membership even if no schedules
      const activeMembership = await Membership.findOne({
        customer: customer._id,
        org: employee.org._id,
        status: 'active'
      }).populate('product').populate('location');
      
      // Validate membership is not expired
      let isMembershipValid = false;
      if (activeMembership) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (activeMembership.nextBillingDate) {
          const nextBilling = new Date(activeMembership.nextBillingDate);
          nextBilling.setHours(0, 0, 0, 0);
          
          // Membership is valid if today is not past the next billing date
          isMembershipValid = today <= nextBilling && activeMembership.status === 'active';
          
          console.log('Membership validation:', {
            product: activeMembership.product?.name,
            status: activeMembership.status,
            nextBillingDate: activeMembership.nextBillingDate,
            today: today,
            isValid: isMembershipValid
          });
        } else {
          // If no nextBillingDate, only check status
          isMembershipValid = activeMembership.status === 'active';
        }
      }
      
      if (activeMembership && isMembershipValid) {
        console.log('Valid active membership found (no schedules):', activeMembership.product?.name);
        
        // Check for recent duplicate check-in (within last 10 seconds)
        const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
        const recentCheckin = await Checkin.findOne({
          customer: customer._id,
          product: activeMembership.product._id,
          createdAt: { $gte: tenSecondsAgo }
        });
        
        if (recentCheckin) {
          console.log('Duplicate check-in detected, using existing record');
          return NextResponse.json({
            success: true,
            customer: {
              _id: customer._id,
              name: customer.name,
              email: customer.email,
              memberId: customer.memberId,
              photo: customer.photo
            },
            membershipCheckin: {
              product: activeMembership.product?.name,
              checkinId: recentCheckin._id
            },
            status: 'membership-checked-in',
            message: 'Membership check-in successful',
            testMode: false
          });
        }
        
        // Create a membership-only check-in record
        const membershipCheckinRecord = new Checkin({
          customer: customer._id,
          product: activeMembership.product._id,
          // Omit schedule field entirely for membership-only check-in
          class: {
            datetime: now,
            location: activeMembership.location?._id || null
          },
          status: 'checked-in',
          method: 'qr-code',
          org: employee.org._id
        });
        
        await membershipCheckinRecord.save();
        
        return NextResponse.json({
          success: true,
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            memberId: customer.memberId,
            photo: customer.photo
          },
          membershipCheckin: {
            product: activeMembership.product?.name,
            checkinId: membershipCheckinRecord._id
          },
          status: 'membership-checked-in',
          message: 'Membership check-in successful',
          testMode: false
        });
      }
      
      // Check if there's an expired membership
      if (activeMembership && !isMembershipValid) {
        // Create a failed check-in record for expired membership
        const failedCheckinRecord = new Checkin({
          customer: customer._id,
          product: activeMembership.product._id,
          class: {
            datetime: now,
            location: activeMembership.location?._id || null
          },
          status: 'no-show',
          method: 'qr-code',
          success: {
            status: false,
            reason: 'membership-expired'
          },
          org: employee.org._id
        });
        
        await failedCheckinRecord.save();
        
        return NextResponse.json({ 
          success: false,
          status: 'membership-expired',
          message: 'Membership has expired',
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            memberId: customer.memberId,
            photo: customer.photo
          },
          membershipDetails: {
            product: activeMembership.product?.name,
            nextBillingDate: activeMembership.nextBillingDate,
            status: activeMembership.status
          },
          checkinId: failedCheckinRecord._id
        });
      }
      
      return NextResponse.json({ 
        success: false,
        status: 'no-scheduled-classes',
        message: 'No classes, courses or memberships found',
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          memberId: customer.memberId,
          photo: customer.photo
        }
      });
    }
    
    // Find the specific class within the time window
    let foundClass = null;
    let foundSchedule = null;
    let foundLocation = null;
    let foundProduct = null;
    
    console.log('Current time:', now.toISOString());
    console.log('Time window:', thirtyMinutesBefore.toISOString(), 'to', thirtyMinutesAfter.toISOString());
    
    for (const schedule of schedules) {
      console.log('Checking schedule:', schedule._id, 'Locations:', schedule.locations?.length || 0);
      
      for (const location of schedule.locations) {
        console.log('Checking location classes:', location.classes?.length || 0);
        
        for (const classItem of location.classes) {
          const classTime = new Date(classItem.datetime);
          
          // In test mode, find any future class with this customer
          if (test) {
            console.log('Test mode - checking class time:', classTime.toISOString());
            
            // Only consider classes in the future
            if (classTime > now) {
              const customerInClass = classItem.customers.find(c => 
                c.customer.toString() === customer._id.toString()
              );
              
              if (customerInClass) {
                console.log('Test mode - Found customer in future class, checking in regardless of 30min window');
                foundClass = classItem;
                foundSchedule = schedule;
                foundLocation = location;
                foundProduct = schedule.product;
                break;
              }
            }
          } else {
            // Normal mode - check time window
            console.log('Class time:', classTime.toISOString(), 'In window?', classTime >= thirtyMinutesBefore && classTime <= thirtyMinutesAfter);
            
            // Check if class is within 30 minutes window
            if (classTime >= thirtyMinutesBefore && classTime <= thirtyMinutesAfter) {
              // Find the customer in this class
              const customerInClass = classItem.customers.find(c => 
                c.customer.toString() === customer._id.toString() && c.status === 'confirmed'
              );
              
              console.log('Customer in class?', customerInClass ? 'Yes' : 'No');
              
              if (customerInClass) {
                foundClass = classItem;
                foundSchedule = schedule;
                foundLocation = location;
                foundProduct = schedule.product;
                break;
              }
            }
          }
        }
        if (foundClass) break;
      }
      if (foundClass) break;
    }
    
    if (!foundClass) {
      console.log('No class found in time window');
      
      // Check for active membership even if no class is found
      const activeMembership = await Membership.findOne({
        customer: customer._id,
        org: employee.org._id,
        status: 'active'
      }).populate('product').populate('location');
      
      // Validate membership is not expired
      let isMembershipValid = false;
      if (activeMembership) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (activeMembership.nextBillingDate) {
          const nextBilling = new Date(activeMembership.nextBillingDate);
          nextBilling.setHours(0, 0, 0, 0);
          
          // Membership is valid if today is not past the next billing date
          isMembershipValid = today <= nextBilling && activeMembership.status === 'active';
          
          console.log('Membership validation (no class in window):', {
            product: activeMembership.product?.name,
            status: activeMembership.status,
            nextBillingDate: activeMembership.nextBillingDate,
            today: today,
            isValid: isMembershipValid
          });
        } else {
          // If no nextBillingDate, only check status
          isMembershipValid = activeMembership.status === 'active';
        }
      }
      
      if (activeMembership && isMembershipValid && !test) {
        console.log('Valid active membership found for general check-in:', activeMembership.product?.name);
        
        // Check for recent duplicate check-in (within last 10 seconds)
        const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
        const recentCheckin = await Checkin.findOne({
          customer: customer._id,
          product: activeMembership.product._id,
          createdAt: { $gte: tenSecondsAgo }
        });
        
        if (recentCheckin) {
          console.log('Duplicate check-in detected, using existing record');
          return NextResponse.json({
            success: true,
            customer: {
              _id: customer._id,
              name: customer.name,
              email: customer.email,
              memberId: customer.memberId,
              photo: customer.photo
            },
            membershipCheckin: {
              product: activeMembership.product?.name,
              checkinId: recentCheckin._id
            },
            status: 'membership-checked-in',
            message: 'Membership check-in successful',
            testMode: false
          });
        }
        
        // Create a membership-only check-in record
        const membershipCheckinRecord = new Checkin({
          customer: customer._id,
          product: activeMembership.product._id,
          // Omit schedule field entirely for membership-only check-in
          class: {
            datetime: now,
            location: activeMembership.location?._id || null
          },
          status: 'checked-in',
          method: 'qr-code',
          org: employee.org._id
        });
        
        await membershipCheckinRecord.save();
        
        return NextResponse.json({
          success: true,
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            memberId: customer.memberId,
            photo: customer.photo
          },
          membershipCheckin: {
            product: activeMembership.product?.name,
            checkinId: membershipCheckinRecord._id
          },
          status: 'membership-checked-in',
          message: 'Membership check-in successful',
          testMode: false
        });
      }
      
      // Find next upcoming class for this customer
      let nextClass = null;
      let nextClassTime = null;
      let nextClassProduct = null;
      
      for (const schedule of schedules) {
        for (const location of schedule.locations) {
          for (const classItem of location.classes) {
            const classTime = new Date(classItem.datetime);
            if (classTime > now && (!nextClassTime || classTime < nextClassTime)) {
              const customerInClass = classItem.customers.find(c => 
                c.customer.toString() === customer._id.toString()
              );
              if (customerInClass) {
                nextClass = classItem;
                nextClassTime = classTime;
                nextClassProduct = schedule.product;
              }
            }
          }
        }
      }
      
      // Check if there's an expired membership
      if (activeMembership && !isMembershipValid) {
        // Create a failed check-in record for expired membership
        const failedCheckinRecord = new Checkin({
          customer: customer._id,
          product: activeMembership.product._id,
          class: {
            datetime: now,
            location: activeMembership.location?._id || null
          },
          status: 'no-show',
          method: 'qr-code',
          success: {
            status: false,
            reason: 'membership-expired'
          },
          org: employee.org._id
        });
        
        await failedCheckinRecord.save();
        
        return NextResponse.json({ 
          success: false,
          status: 'membership-expired',
          message: 'Membership has expired',
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            memberId: customer.memberId,
            photo: customer.photo
          },
          membershipDetails: {
            product: activeMembership.product?.name,
            nextBillingDate: activeMembership.nextBillingDate,
            status: activeMembership.status
          },
          nextClass: nextClassTime ? {
            datetime: nextClassTime,
            productName: nextClassProduct?.name || 'Class/Course',
            timeUntil: Math.round((nextClassTime - now) / 1000 / 60) // minutes until class
          } : null,
          checkinId: failedCheckinRecord._id
        });
      }
      
      return NextResponse.json({ 
        success: false,
        status: 'no-class-in-window',
        message: 'No class within check-in window (30 minutes before/after class time)',
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          memberId: customer.memberId,
          photo: customer.photo
        },
        nextClass: nextClassTime ? {
          datetime: nextClassTime,
          productName: nextClassProduct?.name || 'Class/Course',
          timeUntil: Math.round((nextClassTime - now) / 1000 / 60) // minutes until class
        } : null,
        hasActiveMembership: false
      });
    }
    
    // Update the customer's status to 'checked in'
    const customerIndex = foundClass.customers.findIndex(c => 
      c.customer.toString() === customer._id.toString()
    );
    
    if (customerIndex !== -1) {
      // Update status in the schedule
      const updatePath = `locations.${schedules[0].locations.indexOf(foundLocation)}.classes.${foundLocation.classes.indexOf(foundClass)}.customers.${customerIndex}.status`;
      
      await Schedule.findByIdAndUpdate(
        foundSchedule._id,
        {
          $set: {
            [updatePath]: 'checked in'
          }
        }
      );
      
      // Create a CLASS check-in record
      const classCheckinRecord = new Checkin({
        customer: customer._id,
        product: foundProduct._id,
        schedule: foundSchedule._id,
        class: {
          datetime: foundClass.datetime,
          location: foundLocation.location
        },
        status: 'checked-in',
        method: 'qr-code',
        org: employee.org._id
      });
      
      await classCheckinRecord.save();
      console.log('Class check-in created:', classCheckinRecord._id);
      
      // Also check for active membership and create SEPARATE record
      let membershipCheckin = null;
      const activeMembership = await Membership.findOne({
        customer: customer._id,
        org: employee.org._id,
        status: 'active'
      }).populate('product');
      
      // Validate membership is not expired for class check-in
      let isMembershipValid = false;
      if (activeMembership) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (activeMembership.nextBillingDate) {
          const nextBilling = new Date(activeMembership.nextBillingDate);
          nextBilling.setHours(0, 0, 0, 0);
          
          // Membership is valid if today is not past the next billing date
          isMembershipValid = today <= nextBilling && activeMembership.status === 'active';
        } else {
          // If no nextBillingDate, only check status
          isMembershipValid = activeMembership.status === 'active';
        }
      }
      
      if (activeMembership && isMembershipValid) {
        console.log('Valid active membership found:', activeMembership.product?.name);
        
        // Create a SEPARATE membership check-in record
        const membershipCheckinRecord = new Checkin({
          customer: customer._id,
          product: activeMembership.product._id,
          // Don't include schedule - this is a membership-only check-in
          class: {
            datetime: now, // Use CURRENT time for membership check-in
            location: foundLocation.location
          },
          status: 'checked-in',
          method: 'qr-code',
          org: employee.org._id
        });
        
        await membershipCheckinRecord.save();
        console.log('Membership check-in created:', membershipCheckinRecord._id);
        
        membershipCheckin = {
          product: activeMembership.product?.name,
          checkinId: membershipCheckinRecord._id
        };
      }
      
      // Return success with details
      return NextResponse.json({
        success: true,
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          memberId: customer.memberId,
          photo: customer.photo
        },
        product: {
          _id: foundProduct._id,
          name: foundProduct.name
        },
        classTime: foundClass.datetime,
        checkinId: classCheckinRecord._id,
        membershipCheckin,
        status: 'checked-in',
        message: test ? 'Test check-in successful' : 'Check-in successful',
        testMode: test
      });
    }
    
    return NextResponse.json({ 
      error: 'Unable to update check-in status' 
    }, { status: 500 });
    
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}