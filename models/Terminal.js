import mongoose from 'mongoose';

const TerminalSchema = new mongoose.Schema({
  label: { type: String, required: true },
  stripeTerminalId: String,
  registrationCode: String,
  type: { type: String, enum: ['simulated', 'physical'], default: 'simulated' },
  status: { type: String, enum: ['online', 'offline', 'unknown'], default: 'unknown' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  lastSeen: Date,
  serialNumber: String,
  deviceType: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Indexes for org, location, and stripeTerminalId references
TerminalSchema.index({ org: 1 });
TerminalSchema.index({ location: 1 });
TerminalSchema.index({ stripeTerminalId: 1 });

const Terminal = mongoose.models.Terminal || mongoose.model('Terminal', TerminalSchema);

export default Terminal;