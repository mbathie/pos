import { connectDB } from "@/lib/mongoose";
import { Schedule, Customer } from '@/models';
import { Types } from 'mongoose';

export async function setClassAvailability({scheduleId, classObjectId, orgId}) {
  const schedule = await Schedule.findOne({ _id: scheduleId, org: orgId }).populate("product");

  if (schedule?.product?.type === 'class') {
    // Find the class across all locations
    let classEntry = null;
    for (const location of schedule.locations || []) {
      const foundClass = location.classes?.find(cls => cls._id.toString() === classObjectId.toString());
      if (foundClass) {
        classEntry = foundClass;
        break;
      }
    }
    
    if (classEntry) {
      let available = schedule.product.capacity ?? 0;

      for (const cust of classEntry.customers) {
        if (cust.status === 'confirmed' || cust.status === 'checked in') {
          available -= 1;
        }
      }

      classEntry.available = available;
      await schedule.save();
    }
  }
}

export async function addToSchedule({cart, employee, transaction}) {
  await connectDB();  
  const orgId = employee.org;

  console.log('Employee in addToSchedule:', employee);
  console.log('Cart products:', cart.products);

  for (const product of cart.products) {
    if (!['class', 'course'].includes(product.type)) continue;

    const productId = product._id;
    const locationId = employee.selectedLocationId;
    
    console.log('Processing product:', productId, 'at location:', locationId);

    let schedule = await Schedule.findOne({
      org: orgId,
      product: productId,
    });

    if (!schedule) {
      console.log('Creating new schedule for product:', productId);
      schedule = await Schedule.create({
        org: orgId,
        product: productId,
        capacity: product.capacity ?? 0,
        available: product.capacity,
        locations: [],
      });
    } else {
      console.log('Found existing schedule:', schedule._id);
    }

    if (product.type === 'course') {
      // Handle course enrollment - create class entries for the selected time slot
      console.log('Processing course enrollment');
      console.log('Product selectedTimeSlot:', product.selectedTimeSlot);
      console.log('Cart customer:', cart.customer);
      console.log('Product schedule:', product.schedule);
      console.log('Full product:', JSON.stringify(product, null, 2));
      
      // Get the customer to enroll
      let customer = cart.customer;
      console.log('Initial cart.customer:', cart.customer);
      
      if (!customer?._id) {
        // Try to get from transaction if not in cart
        console.log('Transaction customer ID:', transaction.customer);
        if (transaction.customer) {
          const Customer = (await import('@/models')).Customer;
          customer = await Customer.findById(transaction.customer);
          console.log('Fetched customer from transaction:', customer);
        }
      }
      
      // Also check if customer might be in the product prices (for backwards compatibility)
      if (!customer?._id && product.prices) {
        for (const price of product.prices) {
          if (price.customers?.length > 0) {
            customer = price.customers[0].customer;
            console.log('Found customer in price.customers:', customer);
            break;
          }
        }
      }
      
      if (!customer?._id) {
        console.warn('⚠️ No customer found for course enrollment - creating empty class entries');
        // Don't exit - still create the class structure for the course
      } else {
        console.log('✅ Will enroll customer:', customer.name || customer._id);
      }
      
      // Get the selected time slot details
      const selectedTime = product.selectedTimeSlot?.time || '10:00'; // Default to 10:00 if not specified
      const selectedLabel = product.selectedTimeSlot?.label || '';
      
      console.log(`Enrolling ${customer?.name || customer?._id || 'no customer'} in course at ${selectedTime} ${selectedLabel}`);
      
      // Get full product details if schedule is missing
      let productSchedule = product.schedule;
      if (!productSchedule) {
        const Product = (await import('@/models')).Product;
        const fullProduct = await Product.findById(product._id);
        productSchedule = fullProduct?.schedule;
        console.log('Fetched product schedule from DB:', productSchedule);
      }
      
      // Generate class entries for each day of the course
      const startDate = new Date(productSchedule?.startDate);
      const endDate = new Date(productSchedule?.endDate);
      const daysOfWeek = productSchedule?.daysOfWeek || [];
      
      // Validate dates
      if (!productSchedule || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('❌ Invalid or missing course schedule dates');
        continue;
      }
      
      console.log('Course schedule:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysOfWeek,
        selectedTime,
        selectedLabel
      });
      
      // Create datetime for the specific time slot
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Ensure location entry exists
      if (!schedule.locations) schedule.locations = [];
      
      let locEntry = schedule.locations.find(loc => 
        loc.location?.toString() === locationId.toString()
      );
      
      if (!locEntry) {
        console.log('Creating new location entry for course');
        schedule.locations.push({
          location: new Types.ObjectId(locationId),
          classes: [],
        });
        locEntry = schedule.locations[schedule.locations.length - 1];
      }
      
      // Generate all class dates for the course duration
      const current = new Date(startDate);
      let classesCreated = 0;
      
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // Convert Sunday = 0 to our format where Monday = 0
        const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        if (daysOfWeek[adjustedDayOfWeek]) {
          // Create datetime for this class
          const classDateTime = new Date(current);
          classDateTime.setHours(hours, minutes, 0, 0);
          
          // Check if this class already exists
          let cls = locEntry.classes.find(c => 
            c.datetime?.getTime() === classDateTime.getTime()
          );
          
          if (!cls) {
            // Create new class entry
            locEntry.classes.push({
              datetime: classDateTime,
              available: product.capacity || 2,
              label: selectedLabel,
              customers: [],
            });
            cls = locEntry.classes[locEntry.classes.length - 1];
            classesCreated++;
          }
          
          // Add customer to this class if we have one and not already enrolled
          if (customer?._id) {
            const alreadyEnrolled = cls.customers.some(c => 
              c.customer?.toString() === customer._id.toString()
            );
            
            if (!alreadyEnrolled && cls.available > 0) {
              cls.customers.push({
                customer: new Types.ObjectId(customer._id),
                status: 'confirmed',
                transaction: new Types.ObjectId(transaction._id),
              });
              cls.available -= 1;
              console.log(`Added customer to class on ${classDateTime.toISOString()}`);
            } else if (alreadyEnrolled) {
              console.log(`Customer already enrolled in class on ${classDateTime.toISOString()}`);
            } else if (cls.available <= 0) {
              console.log(`No spots available for class on ${classDateTime.toISOString()}`);
            }
          } else {
            console.log(`No customer to add to class on ${classDateTime.toISOString()}`);
          }
        }
        
        // Move to next day
        current.setDate(current.getDate() + 1);
      }
      
      console.log(`Created/updated ${classesCreated} class entries for course`);
      
      // Update overall availability
      const totalQty = product.prices?.reduce((sum, price) => sum + (price.qty ?? 0), 0) || 0;
      schedule.available = Math.max(0, (schedule.available || product.capacity) - totalQty);
      
      schedule.markModified('locations');
      schedule.markModified('available');
    } else if (product.type === 'class') {
      // Handle class enrollment - customers go under locations.classes
      const selectedTimes = product.selectedTimes || [];
      
      for (const time of selectedTimes) {
      console.log('Processing selected time:', time);
      
      // Handle both formats: {datetime: "", label: ""} and {value: ""}
      const datetimeString = time.datetime || time.value;
      const datetime = new Date(datetimeString);

        if (!schedule.locations) schedule.locations = [];

        console.log('Looking for location:', locationId, 'in schedule.locations');
        console.log('Current locations:', schedule.locations);

        let locEntry = schedule.locations.find(loc => loc.location?.toString() === locationId.toString());
        if (!locEntry) {
          console.log('Creating new location entry for:', locationId);
          schedule.locations.push({
            location: new Types.ObjectId(locationId),
            classes: [],
          });
          locEntry = schedule.locations[schedule.locations.length - 1];
        } else {
          console.log('Found existing location entry');
        }

        let clsIndex = locEntry.classes.findIndex(cls =>
          cls.datetime?.getTime() === datetime.getTime()
        );

        if (clsIndex === -1) {
          console.log('pusing onto classes array')
          locEntry.classes.push({
            datetime,
            available: product.capacity ?? 0,
            customers: [],
          });
          locEntry.classes = [...locEntry.classes];
          clsIndex = locEntry.classes.length - 1;
        }

        const cls = locEntry.classes[clsIndex];
        console.log(cls)

        // Use the new prices format at product level
        for (const price of product.prices || []) {
          for (const c of price.customers || []) {
            if (!c.customer?._id) continue;

            const alreadyExists = cls.customers.some(entry =>
              entry.customer.toString() === c.customer._id.toString()
            );

            if (cls.available > 0) {
              // console.log('Before assigning customer, cls.available:', cls.available);
              if (!alreadyExists) {
                console.log('after checking if not already exists')
                cls.customers.push({
                  customer: new Types.ObjectId(c.customer._id),
                  status: 'confirmed',
                  transaction: new Types.ObjectId(transaction._id),
                });

                await Customer.updateOne(
                  { _id: c.customer._id },
                  { $set: { assigned: true } }
                );
              }
              cls.available -= 1;
              // console.log('After assigning customer, cls.available:', cls.available);
            }
          }
        }
      }
    }

    // Save the schedule
    console.log('Final schedule before save:', JSON.stringify(schedule.locations, null, 2));
    schedule.locations = [...schedule.locations];
    schedule.markModified('locations');
    
    console.log(`Saving schedule for ${product.type}`);
    const savedSchedule = await schedule.save();
    console.log('Schedule saved successfully:', savedSchedule._id);
  }
}
