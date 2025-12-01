import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  status: { type: String, enum: ['placed', 'cancelled', 'completed'], default: 'Placed' },
  products: [{
    _id: false,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number },
    name: String,
    item: mongoose.Schema.Types.Mixed,
  }],
  orderNumber: Number,
  // For group bookings: order won't appear on bump screen until this date/time
  notBefore: { type: Date, default: null },
}, { timestamps: true, strict: false });

// Indexes for transaction, location, customer, status
OrderSchema.index({ transaction: 1 });
OrderSchema.index({ location: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ notBefore: 1 });

OrderSchema.pre('save', async function (next) {
  if (this.orderNumber) return next();

  const Order = mongoose.model('Order');
  // Set startOfWeek to most recent Sunday at midnight
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - dayOfWeek;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  const count = await Order.countDocuments({
    createdAt: { $gte: startOfWeek }
  });

  this.orderNumber = count + 1;
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;