import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for org and category references
FolderSchema.index({ org: 1 });
FolderSchema.index({ category: 1 });
FolderSchema.index({ order: 1 });

const Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);

export default Folder;