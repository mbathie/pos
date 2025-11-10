import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  capacity: Number,
  available: {
    type: Number,
    default: 0,
  },
  // Both classes and courses use locations.classes structure
  locations: [{
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    classes: [{
      datetime: { type: Date, required: true },
      duration: Number,
      available: Number,
      label: String, // For course time labels like "Morning" or "Arvo"
      customers: [{
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        status: { type: String, enum: ['confirmed', 'cancelled', 'checked in', 'pending_waiver'] },
        transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
        isPlaceholder: { type: Boolean, default: false }
      }]
    }]
  }]
}, { timestamps: true, strict: false });

// Compound index for org and product
ScheduleSchema.index({ org: 1, product: 1 });

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);

export default Schedule;