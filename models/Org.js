import mongoose from 'mongoose';

const OrgSchema = new mongoose.Schema({
  name: String,
  phone: String,
}, { 
  timestamps: true,
  strict: false
});

// Index for name (if you often search orgs by name)
OrgSchema.index({ name: 1 });

const Org = mongoose.models.Org || mongoose.model('Org', OrgSchema);

export default Org;