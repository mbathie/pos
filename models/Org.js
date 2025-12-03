import mongoose from 'mongoose';

const OrgSchema = new mongoose.Schema({
  name: String,
  phone: String,
  membershipSuspensionDaysPerYear: {
    type: Number,
    default: 30
  },
  // Minimum payment percentage for company/group booking invoices (0-100)
  minInvoicePaymentPercent: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  // Flag to skip first-time POS setup checks once all steps have passed
  posSetupComplete: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true,
  strict: false
});

// Index for name (if you often search orgs by name)
OrgSchema.index({ name: 1 });

const Org = mongoose.models.Org || mongoose.model('Org', OrgSchema);

export default Org;