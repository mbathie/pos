import mongoose from 'mongoose';

const PrepaidPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  thumbnail: String,
  waiverRequired: { type: Boolean, default: false },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  prices: [{
    name: { type: String },
    value: { type: Number },
    minor: { type: Boolean, default: false }
  }],
  passes: { type: Number },
  amount: { type: Number },
  active: { type: Boolean, default: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

PrepaidPackSchema.index({ org: 1 });
PrepaidPackSchema.index({ name: 1 });

const PrepaidPack = mongoose.models.PrepaidPack || mongoose.model('PrepaidPack', PrepaidPackSchema);

export default PrepaidPack;
