import mongoose from 'mongoose';

const ModSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  modGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModGroup',
    required: true
  },
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true
  },
  price: {
    type: Number,
    default: 0
  },
  // Optional icon/thumbnail for the modification
  thumbnail: {
    type: String
  },
  // For tracking common attributes like caffeine content, calories, etc.
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
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
  },
  // Track if this is a default option
  isDefault: {
    type: Boolean,
    default: false
  },
  // Whether this mod can be added more than once (default true = allow multiple qty)
  allowMultiple: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes for efficient queries
ModSchema.index({ modGroup: 1, deleted: 1 });
ModSchema.index({ org: 1, deleted: 1 });
ModSchema.index({ modGroup: 1, order: 1 });

const Mod = mongoose.models.Mod || mongoose.model('Mod', ModSchema);

export default Mod;