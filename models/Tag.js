import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: String,
  color: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Auto-generate slug from name before save
TagSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
TagSchema.index({ org: 1 });
TagSchema.index({ slug: 1 });
TagSchema.index({ order: 1 });

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

export default Tag;
