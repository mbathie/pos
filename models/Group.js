import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for org and category references
GroupSchema.index({ org: 1 });
GroupSchema.index({ category: 1 });
GroupSchema.index({ order: 1 });

const Group = mongoose.models.Group || mongoose.model('Group', GroupSchema);

export default Group;
