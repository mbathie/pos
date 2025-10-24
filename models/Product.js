import mongoose from 'mongoose';
import mongooseDelete from 'mongoose-delete';

const ProductSchema = new mongoose.Schema({
  name: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  accounting: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounting' },
  type: { type: String, enum: ['class', 'course', 'general', 'membership', 'shop', 'divider'] },
  duration: { name: Number, unit: String },
  capacity: Number,
  bump: { type: Boolean, default: false },
  waiverRequired: { type: Boolean, default: false },
  publish: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, {
  timestamps: true,
  strict: false  // allow any additional fields
});

// Indexes for category, folder, group, locations, and accounting
ProductSchema.index({ category: 1 });
ProductSchema.index({ folder: 1 });
ProductSchema.index({ group: 1 });
ProductSchema.index({ locations: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ accounting: 1 });
ProductSchema.index({ order: 1 });

ProductSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export default Product;