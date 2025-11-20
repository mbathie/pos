import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  abn: {
    type: String,
    required: false
  },
  contactName: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: false
  },
  address: {
    address1: String,
    address2: String,
    city: String,
    state: String,
    postcode: String,
    country: String
  },
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  notes: String,
  // Stripe integration
  stripeCustomerId: {
    type: String,
    required: false
  },
  paymentTerms: {
    type: String,
    enum: ['due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_60'],
    default: 'due_on_receipt'
  }
}, { timestamps: true });

// Indexes
CompanySchema.index({ org: 1 });
CompanySchema.index({ name: 1 });
CompanySchema.index({ abn: 1 });
CompanySchema.index({ contactEmail: 1 });

const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);

export default Company;
