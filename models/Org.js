import mongoose from 'mongoose';

const OrgSchema = new mongoose.Schema({
  name: String,
  phone: String,
  membershipSuspensionDaysPerYear: {
    type: Number,
    default: 30
  },
}, {
  timestamps: true,
  strict: false
});

// Index for name (if you often search orgs by name)
OrgSchema.index({ name: 1 });

const Org = mongoose.models.Org || mongoose.model('Org', OrgSchema);

export default Org;