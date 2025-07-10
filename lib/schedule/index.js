import { connectDB } from "@/lib/mongoose";
import { Schedule, Customer } from '@/models';
import { Types } from 'mongoose';

export async function setClassAvailability({scheduleId, classObjectId, orgId}) {
  const schedule = await Schedule.findOne({ _id: scheduleId, org: orgId }).populate("product");

  if (schedule?.product?.type === 'class') {
    const classEntry = schedule.classes.id(classObjectId);
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

  console.log(employee)

  for (const product of cart.products) {
    if (!['class', 'course'].includes(product.type)) continue;

    const productId = product._id;
    const locationId = employee.selectedLocationId;

    let schedule = await Schedule.findOne({
      org: orgId,
      product: productId,
    });

    if (!schedule) {
      schedule = await Schedule.create({
        org: orgId,
        product: productId,
        capacity: product.capacity ?? 0,
        available: product.capacity,
        locations: [],
      });
    }

    // console.log(JSON.stringify(product.variations[0].prices, null, 2));
    // console.log(`before = ${schedule.available}`)

    if (product.type === 'course') {

      // schedule.available should = the sum of all qty's in product.variations[].prices[].qty
      schedule.available = schedule.available -= product.variations?.reduce((acc, variation) => {
        return acc + (variation.prices?.reduce((sum, price) => sum + (price.qty ?? 0), 0) || 0);
      }, 0) || 0;
      // console.log('Course available slots calculated:', schedule.available);
      schedule.markModified('available');
    }
    // console.log(`after = ${schedule.available}`)


    for (const variation of product.variations || []) {
      if (!variation.timesCalc || !variation.timesCalc.length) {
        variation.timesCalc = variation.times?.map(time => ({
          value: time,
          selected: true
        })) || [];
      }
      for (const time of variation.timesCalc || []) {
        if (!time.selected) continue;

        console.log(time)

        const datetime = new Date(time.value);

        if (!schedule.locations) schedule.locations = [];

        console.log('after checking schedule.location')

        let locEntry = schedule.locations.find(loc => loc.location?.toString() === locationId.toString());
        if (!locEntry) {
          schedule.locations.push({
            location: new Types.ObjectId(locationId),
            classes: [],
          });
          locEntry = schedule.locations[schedule.locations.length - 1];
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

        for (const price of variation.prices || []) {
          for (const c of price.customers || []) {
            if (!c.customer?._id) continue;

            console.log('here x')

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

    schedule.locations = [...schedule.locations];
    schedule.markModified('locations');
    // console.log(`before save = ${schedule.available}`)
    await schedule.save();
  }
}
