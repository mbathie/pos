import mongoose from 'mongoose';
import mongooseDelete from 'mongoose-delete';

const ProductSchema = new mongoose.Schema({
  name: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  accounting: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounting' },
  type: { type: String, enum: ['class', 'course', 'general', 'membership', 'shop'] },
  duration: { name: Number, unit: String },
  capacity: Number,
  bump: { type: Boolean, default: false },
  waiverRequired: { type: Boolean, default: false },
  // times: [{
  //   _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  //   except: [String]
  // }],
  order: { type: Number, default: 0 },
  // Reference to modification groups that can be applied to this product
  modGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModGroup' }],
}, {
  timestamps: true,
  strict: false  // allow any additional fields
});

// Indexes for category, folder, locations, and accounting
ProductSchema.index({ category: 1 });
ProductSchema.index({ folder: 1 });
ProductSchema.index({ locations: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ accounting: 1 });
ProductSchema.index({ order: 1 });

ProductSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export default Product;