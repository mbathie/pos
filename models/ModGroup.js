import mongoose from 'mongoose';

const ModGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true
  },
  allowMultiple: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index for efficient queries
ModGroupSchema.index({ org: 1, deleted: 1 });
ModGroupSchema.index({ org: 1, name: 1 });

const ModGroup = mongoose.models.ModGroup || mongoose.model('ModGroup', ModGroupSchema);

export default ModGroup;