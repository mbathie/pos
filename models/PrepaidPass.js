import mongoose from 'mongoose';

const RedemptionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  products: [{ _id: mongoose.Schema.Types.ObjectId, name: String }],
  count: Number,
}, { _id: false });

const PrepaidPassSchema = new mongoose.Schema({
  pack: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepaidPack' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  code: { type: String, unique: true, required: true },
  totalPasses: { type: Number, required: true },
  remainingPasses: { type: Number, required: true },
  products: [{ _id: mongoose.Schema.Types.ObjectId, name: String }],
  redemptions: [RedemptionSchema],
  status: { type: String, enum: ['active', 'depleted'], default: 'active' },
}, { timestamps: true });

PrepaidPassSchema.index({ org: 1 });
PrepaidPassSchema.index({ customer: 1 });

const PrepaidPass = mongoose.models.PrepaidPass || mongoose.model('PrepaidPass', PrepaidPassSchema);

export default PrepaidPass;
