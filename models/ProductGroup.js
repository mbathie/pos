import mongoose from 'mongoose';

const ProductGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  thumbnail: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  amount: { type: Number, required: true },
  active: { type: Boolean, default: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

ProductGroupSchema.index({ org: 1 });
ProductGroupSchema.index({ name: 1 });

const ProductGroup = mongoose.models.ProductGroup || mongoose.model('ProductGroup', ProductGroupSchema);

export default ProductGroup;

