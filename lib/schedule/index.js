import { connectDB } from "@/lib/mongoose";
import { Schedule, Customer } from '@/models';
import { Types } from 'mongoose';
// import { extractCustomers } from "../customers";

export async function addToSchedule({cart, employee, transaction}) {
  await connectDB();  
  const orgId = employee.org;

  for (const product of cart.products) {
    if (!['class', 'course'].includes(product.type)) continue;

    const productId = product._id;
    const locationId = cart.location._id;

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
        classes: [],
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
      for (const time of variation.timesCalc || []) {
        if (!time.selected) continue;

        const datetime = new Date(time.value);
        let clsIndex = schedule.classes.findIndex(cls =>
          cls.datetime?.getTime() === datetime.getTime()
        );

        if (clsIndex === -1) {
          schedule.classes.push({
            datetime,
            location: new Types.ObjectId(locationId),
            available: product.capacity ?? 0,
            customers: [],
          });
          clsIndex = schedule.classes.length - 1;
        }

        const cls = schedule.classes[clsIndex];

        for (const price of variation.prices || []) {
          for (const c of price.customers || []) {
            if (!c.customer?._id) continue;

            const alreadyExists = cls.customers.some(entry =>
              entry.customer.toString() === c.customer._id.toString()
            );

            if (cls.available > 0) {
              // console.log('Before assigning customer, cls.available:', cls.available);
              if (!alreadyExists) {
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

    schedule.markModified('classes');
    // console.log(`before save = ${schedule.available}`)
    await schedule.save();
  }
}
