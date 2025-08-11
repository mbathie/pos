import mongoose from 'mongoose';

const checkinSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
    // No required field - making it truly optional for membership-only check-ins
  },
  class: {
    datetime: Date,
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }
  },
  status: {
    type: String,
    enum: ['checked-in', 'late', 'early', 'no-show'],
    default: 'checked-in'
  },
  method: {
    type: String,
    enum: ['qr-code', 'manual', 'staff'],
    default: 'qr-code'
  },
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true
  }
}, {
  timestamps: true
});

// Index for quick lookups
checkinSchema.index({ customer: 1, createdAt: -1 });
checkinSchema.index({ product: 1, createdAt: -1 });
checkinSchema.index({ schedule: 1 });

const Checkin = mongoose.models.Checkin || mongoose.model('Checkin', checkinSchema);

export default Checkin;