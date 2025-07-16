import { connectDB } from "@/lib/mongoose";
import { Order } from '@/models';

export async function addToOrder({ cart, employee, transaction }) {
  await connectDB();

  const locationId = employee.selectedLocationId;
  const customer = cart.customer;

  const shopProducts = cart.products.filter(p => p.type === 'shop');

  if (shopProducts.length === 0) return;

  console.log(shopProducts)

  await Order.create({
    transaction,
    location: locationId,
    customer,
    status: 'placed',
    products: shopProducts.map(p => ({
      product: p._id,
      item: p.item,
      qty: p.qty,
      name: p.name,
    }))
  });
}
