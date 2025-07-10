import { connectDB } from "@/lib/mongoose";
import { Customer } from '@/models';

// export async function extractCustomers({products}) {
//   const customerMap = new Map();

//   for (const product of products) {
//     for (const variation of product.variations || []) {
//       for (const price of variation.prices || []) {
//         if (price.customer && price.customer._id) {
//           customerMap.set(price.customer._id.toString(), price.customer);
//         }
//       }
//     }
//   }

//   return Array.from(customerMap.values());
// }

export async function assignCustomers({products}) {
  await connectDB();

  const customers = await extractCustomers({ products });

  for (const customer of customers) {
    if (customer._id) {
      await Customer.updateOne(
        { _id: customer._id },
        { $set: { assigned: true } }
      );
    }
  }
}

// export async function generateCustomerId() {
//   await connectDB();

//   let memberId;
//   let exists = true;

//   while (exists) {
//     memberId = Math.floor(100000 + Math.random() * 900000); // generate 6-digit number
//     exists = await Customer.findOne({ memberId });
//   }

//   return memberId;
// }