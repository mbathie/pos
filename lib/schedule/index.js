import { connectDB } from "@/lib/mongoose";
import { Schedule } from '@/models';
import { Types } from 'mongoose';

export async function addToSchedule({cart, employee, customer, transaction}) {
  // console.log(transaction)
  await connectDB();  
  const orgId = employee.org;
  console.log(cart)

  for (const product of cart.products) {
    if (product.type !== 'class') continue;

    const productId = product._id;
    const location = product.location || null;

    let schedule;
    schedule = await Schedule.findOne({
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

        // if should prevent adding a new 

        const date = new Date(time.value);

        let clsIndex = schedule.classes.findIndex(cls => cls?.datetime?.getTime() === date.getTime());
        if (clsIndex === -1) {
          schedule.classes.push({
            location: new Types.ObjectId(cart.location._id),
            datetime: date,
            available: product.capacity,
          });
          clsIndex = schedule.classes.length - 1;
        }

        // console.log(clsIndex)

        const alreadyAdded = schedule.classes[clsIndex].customers.some(c => c.customer.toString() === customerId);
        if (!alreadyAdded && schedule.classes[clsIndex].available > 0) {
          schedule.classes[clsIndex].customers.push({
            customer: new Types.ObjectId(customer._id),
            status: 'confirmed',
            transaction: new Types.ObjectId(transaction._id),
          });
          schedule.classes[clsIndex].available -= 1;
        }
        // console.log('Updated class:', schedule.classes[clsIndex]);
      }
    }

    // console.log('Saving schedule:', JSON.stringify(schedule, null, 2));
    schedule.markModified('classes');
    await schedule.save();

  }
}
