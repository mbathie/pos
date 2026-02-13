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
      // Handle course enrollment - create class entries for selected day+time slots only
      console.log('Processing course enrollment');

      // Get the customer to enroll
      let customer = cart.customer;

      if (!customer?._id) {
        if (transaction.customer) {
          const Customer = (await import('@/models')).Customer;
          customer = await Customer.findById(transaction.customer);
        }
      }

      if (!customer?._id && product.prices) {
        for (const price of product.prices) {
          if (price.customers?.length > 0) {
            customer = price.customers[0].customer;
            break;
          }
        }
      }

      if (!customer?._id) {
        console.warn('No customer found for course enrollment - creating empty class entries');
      }

      // Get selected slots (new multi-select format) or fall back to old selectedTimeSlot
      const selectedSlots = product.selectedSlots || [];

      // Backwards compatibility: convert old selectedTimeSlot to selectedSlots format
      if (selectedSlots.length === 0 && product.selectedTimeSlot) {
        // Old format had a single time slot applied to all active days
        const daysOfWeekData = product.schedule?.daysOfWeek || [];
        for (const dayData of daysOfWeekData) {
          if (dayData.dayIndex >= 0 && dayData.dayIndex < 7) {
            const hasSelectedTimes = dayData.times?.some(t => t.selected);
            if (hasSelectedTimes) {
              selectedSlots.push({
                dayIndex: dayData.dayIndex,
                time: product.selectedTimeSlot.time,
                label: product.selectedTimeSlot.label || '',
              });
            }
          }
        }
      }

      console.log('Selected slots:', selectedSlots);

      // Get full product details if schedule is missing
      let productSchedule = product.schedule;
      if (!productSchedule) {
        const Product = (await import('@/models')).Product;
        const fullProduct = await Product.findById(product._id);
        productSchedule = fullProduct?.schedule;
      }

      // Generate class entries for each day of the course
      const startDate = new Date(productSchedule?.startDate);
      const endDate = new Date(productSchedule?.endDate);

      // Validate dates
      if (!productSchedule || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid or missing course schedule dates');
        continue;
      }

      // Build a lookup: dayIndex -> [{ time, label }] from selectedSlots
      const slotsByDay = {};
      for (const slot of selectedSlots) {
        if (!slotsByDay[slot.dayIndex]) slotsByDay[slot.dayIndex] = [];
        slotsByDay[slot.dayIndex].push({ time: slot.time, label: slot.label || '' });
      }

      // Ensure location entry exists
      if (!schedule.locations) schedule.locations = [];

      let locEntry = schedule.locations.find(loc =>
        loc.location?.toString() === locationId.toString()
      );

      if (!locEntry) {
        schedule.locations.push({
          location: new Types.ObjectId(locationId),
          classes: [],
        });
        locEntry = schedule.locations[schedule.locations.length - 1];
      }

      // Only create entries from today (or startDate, whichever is later) onwards
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const effectiveStart = now > startDate ? now : new Date(startDate);
      const current = new Date(effectiveStart);
      let classesCreated = 0;

      // Get repeat frequency (default to weekly for backwards compatibility)
      const repeatFrequency = productSchedule?.repeatFrequency || 'weekly';
      const scheduleStartDay = startDate.getDate();

      const getWeekNumber = (date) => {
        const diffTime = date.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 7);
      };

      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // Convert Sunday = 0 to our format where Monday = 0
        const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Check if this day has any selected slots
        const slotsForDay = slotsByDay[adjustedDayOfWeek];
        if (!slotsForDay) {
          current.setDate(current.getDate() + 1);
          continue;
        }

        // Check repeat frequency
        let shouldIncludeDate = false;
        if (repeatFrequency === 'weekly') {
          shouldIncludeDate = true;
        } else if (repeatFrequency === 'biweekly') {
          const weekNum = getWeekNumber(current);
          shouldIncludeDate = weekNum % 2 === 0;
        } else if (repeatFrequency === 'monthly') {
          const currentDay = current.getDate();
          const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
          shouldIncludeDate = currentDay === scheduleStartDay ||
            (scheduleStartDay > lastDayOfMonth && currentDay === lastDayOfMonth);
        }

        if (shouldIncludeDate) {
          // Create a class entry for each selected slot on this day
          for (const slot of slotsForDay) {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const classDateTime = new Date(current);
            classDateTime.setHours(hours, minutes, 0, 0);

            // Check if this class already exists
            let cls = locEntry.classes.find(c =>
              c.datetime?.getTime() === classDateTime.getTime()
            );

            if (!cls) {
              locEntry.classes.push({
                datetime: classDateTime,
                available: product.capacity || 2,
                label: slot.label,
                customers: [],
              });
              cls = locEntry.classes[locEntry.classes.length - 1];
              classesCreated++;
            }

            // Add customers from prices to this class
            for (const price of product.prices || []) {
              for (const c of price.customers || []) {
                if (!c.customer?._id) continue;

                const isDependent = price.minor && c.dependent?._id;

                const alreadyEnrolled = isDependent
                  ? cls.customers.some(entry =>
                      entry.dependent?.toString() === c.dependent._id.toString()
                    )
                  : cls.customers.some(entry =>
                      entry.customer?.toString() === c.customer._id.toString() && !entry.dependent
                    );

                if (!alreadyEnrolled && cls.available > 0) {
                  const customerEntry = {
                    customer: new Types.ObjectId(c.customer._id),
                    status: 'confirmed',
                    transaction: new Types.ObjectId(transaction._id),
                  };

                  if (isDependent) {
                    customerEntry.dependent = new Types.ObjectId(c.dependent._id);
                  }

                  cls.customers.push(customerEntry);
                  cls.available -= 1;
                }
              }
            }
          }
        }

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

            // Check if this is a dependent enrollment (minor price with dependent)
            const isDependent = price.minor && c.dependent?._id;
            
            // For dependents, check if the same dependent is already enrolled
            // For regular customers, check if the customer is already enrolled
            const alreadyExists = isDependent 
              ? cls.customers.some(entry => 
                  entry.dependent?.toString() === c.dependent._id.toString()
                )
              : cls.customers.some(entry =>
                  entry.customer.toString() === c.customer._id.toString() && !entry.dependent
                );

            if (cls.available > 0) {
              // console.log('Before assigning customer, cls.available:', cls.available);
              if (!alreadyExists) {
                console.log('after checking if not already exists')
                
                // Create the customer entry
                const customerEntry = {
                  customer: new Types.ObjectId(c.customer._id), // Always store parent/guardian
                  status: 'confirmed',
                  transaction: new Types.ObjectId(transaction._id),
                };
                
                // If this is a dependent, add the dependent reference
                if (isDependent) {
                  customerEntry.dependent = new Types.ObjectId(c.dependent._id);
                  console.log(`Enrolling dependent ${c.dependent.name} under parent ${c.customer.name}`);
                } else {
                  console.log(`Enrolling customer ${c.customer.name}`);
                }
                
                cls.customers.push(customerEntry);

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
