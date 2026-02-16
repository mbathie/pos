import { connectDB } from "@/lib/mongoose";
import { Order } from '@/models';

export async function addToOrder({ cart, employee, transaction }) {
  await connectDB();

  const locationId = employee.selectedLocationId;
  const customer = cart.customer?._id || cart.customer;

  const shopProducts = cart.products.filter(p => p.type === 'shop' && p.bump);

  if (shopProducts.length === 0) return;

  // Check if any product is from a group booking with a scheduled date/time
  // Use the earliest scheduled date if multiple exist
  let notBefore = null;
  for (const p of shopProducts) {
    // Support both formats:
    // - scheduledDateTime: combined ISO string from GroupSheet (e.g. "2026-02-18T10:00")
    // - groupScheduledDate + groupScheduledTime: legacy separate fields
    if (p.scheduledDateTime) {
      const scheduledDate = new Date(p.scheduledDateTime);
      if (!isNaN(scheduledDate.getTime())) {
        if (!notBefore || scheduledDate < notBefore) {
          notBefore = scheduledDate;
        }
      }
    } else if (p.groupScheduledDate) {
      const scheduledDate = new Date(p.groupScheduledDate);

      // If there's a scheduled time, parse and apply it
      if (p.groupScheduledTime) {
        const [time, period] = p.groupScheduledTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        if (period?.toLowerCase() === 'pm' && hours !== 12) {
          hour24 = hours + 12;
        } else if (period?.toLowerCase() === 'am' && hours === 12) {
          hour24 = 0;
        }
        scheduledDate.setHours(hour24, minutes || 0, 0, 0);
      }

      // Use the earliest scheduled time if multiple products have different times
      if (!notBefore || scheduledDate < notBefore) {
        notBefore = scheduledDate;
      }
    }
  }

  await Order.create({
    transaction,
    location: locationId,
    customer,
    status: 'placed',
    notBefore,
    products: shopProducts.map(p => ({
      product: p._id,
      item: p.item || {}, // Use the item object directly which already has modGroups from calcCartValueShop
      qty: p.qty,
      name: p.name,
    }))
  });
}
