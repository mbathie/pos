import mongoose from 'mongoose';

const AccountingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  tax: { type: Boolean, default: false },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
AccountingSchema.index({ org: 1 });
AccountingSchema.index({ code: 1, org: 1 }, { unique: true });

const Accounting = mongoose.models.Accounting || mongoose.model('Accounting', AccountingSchema);

export default Accounting;