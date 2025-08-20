import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: String,
  thumbnail: String, // Icon/thumbnail URL or base64 image
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  menu: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  deleted: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Index for org reference
CategorySchema.index({ org: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

export default Category;