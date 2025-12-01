import mongoose from 'mongoose';

const ProductGroupVariationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // additional products for this variation
}, { _id: false });

const ProductGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  thumbnail: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // base products included in all variations
  variations: [ProductGroupVariationSchema], // variations with their own price and additional products
  amount: { type: Number }, // deprecated - use variations instead, kept for backward compatibility
  active: { type: Boolean, default: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

ProductGroupSchema.index({ org: 1 });
ProductGroupSchema.index({ name: 1 });

const ProductGroup = mongoose.models.ProductGroup || mongoose.model('ProductGroup', ProductGroupSchema);

export default ProductGroup;

