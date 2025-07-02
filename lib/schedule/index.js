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
        classes: [],
      });
    }

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

            if (!alreadyExists && cls.available > 0) {
              cls.customers.push({
                customer: new Types.ObjectId(c.customer._id),
                status: 'confirmed',
                transaction: new Types.ObjectId(transaction._id),
              });
              cls.available -= 1;

              await Customer.updateOne(
                { _id: c.customer._id },
                { $set: { assigned: true } }
              );
            }
          }
        }
      }
    }

    schedule.markModified('classes');
    await schedule.save();
  }
}
