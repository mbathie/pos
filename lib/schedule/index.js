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
      // Calculate total quantity from product.prices array
      const totalQty = product.prices?.reduce((sum, price) => sum + (price.qty ?? 0), 0) || 0;
      schedule.available = schedule.available - totalQty;
      // console.log('Course available slots calculated:', schedule.available);
      schedule.markModified('available');
    }
    // console.log(`after = ${schedule.available}`)


    // Use the new selectedTimes format at product level
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

    console.log('Final schedule before save:', JSON.stringify(schedule.locations, null, 2));
    schedule.locations = [...schedule.locations];
    schedule.markModified('locations');
    console.log(`Saving schedule with ${schedule.locations.length} locations`);
    const savedSchedule = await schedule.save();
    console.log('Schedule saved successfully:', savedSchedule._id);
  }
}
