import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: mongoose.Schema.Types.Mixed,
  hours: mongoose.Schema.Types.Mixed,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
}, { timestamps: true, strict: false });

// Index for org reference
LocationSchema.index({ org: 1 });

const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);

export default Location;