import mongoose from 'mongoose';
import mongooseDelete from 'mongoose-delete';

const POSInterfaceItemSchema = new mongoose.Schema({
  // Reference to the actual item (could be folder, product, or divider)
  itemType: { type: String, enum: ['folder', 'product', 'divider', 'group', 'prepaid'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const POSInterfaceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  thumbnail: String,
  items: [POSInterfaceItemSchema],
  order: { type: Number, default: 0 }
}, { _id: true });

const POSInterfaceDeviceSchema = new mongoose.Schema({
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  browserId: String
}, { _id: false });

const POSInterfaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  devices: [POSInterfaceDeviceSchema],
  categories: [POSInterfaceCategorySchema],
  isDefault: { type: Boolean, default: false }, // Mark one interface as default
}, {
  timestamps: true
});

// Indexes
POSInterfaceSchema.index({ org: 1 });
POSInterfaceSchema.index({ locations: 1 });

POSInterfaceSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

const POSInterface = mongoose.models.POSInterface || mongoose.model('POSInterface', POSInterfaceSchema);

export default POSInterface;
