import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
  type: { type: String, enum: ['percent', 'amount'], required: true },
  expiry: { type: Date },
  description: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
DiscountSchema.index({ org: 1 });

const Discount = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);

export default Discount;