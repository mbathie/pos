import mongoose from 'mongoose';

const GeneralSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date },
  hours: { type: Number },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true, strict: false });

// Indexes for org, product, customer, location
GeneralSchema.index({ org: 1 });
GeneralSchema.index({ product: 1 });
GeneralSchema.index({ customer: 1 });
GeneralSchema.index({ location: 1 });

const General = mongoose.models.General || mongoose.model('General', GeneralSchema);

export default General;