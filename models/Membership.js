import mongoose from 'mongoose';

const MembershipSchema = new mongoose.Schema({
  // Core References
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  
  // Subscription Details
  variation: String, // e.g., "1"
  unit: String, // e.g., "month", "year"
  priceId: mongoose.Schema.Types.ObjectId, // Reference to specific price within product variations
  priceName: String, // e.g., "Youth", "Adult"
  amount: Number, // Subscription amount per billing cycle
  
  // Stripe Integration
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  stripeProductId: String,
  stripePriceId: String,
  
  // Subscription Lifecycle
  subscriptionStartDate: { type: Date, required: true },
  nextBillingDate: { type: Date, required: true },
  subscriptionEndDate: Date, // Optional - for fixed-term memberships
  
  // Status Management
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'suspended', 'pending'],
    default: 'active'
  },
  suspendedUntil: Date, // Date when suspension ends and membership resumes

  // Suspension History
  suspensions: [{
    suspendedAt: { type: Date, default: Date.now },
    suspensionDays: Number,
    resumesAt: Date,
    yearStartDate: Date, // Start of the 365-day period for tracking
    stripeInvoiceItemId: String, // ID of the credit invoice item in Stripe
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    note: String,
    scheduledPause: { type: Boolean, default: false }, // True if this was scheduled for future
    createdAt: Date, // When this suspension was created
    actualResumedAt: Date, // If resumed early, when it actually resumed
    adjustmentInvoiceItemId: String // ID of adjustment if resumed early
  }],

  // Scheduled Pause Fields
  scheduledPauseDate: Date, // Future date when pause should start
  scheduledResumDate: Date, // Future date when pause should end
  scheduledPauseDays: Number, // Number of days for scheduled pause
  
  // Billing History Reference
  billingMethod: { type: String, enum: ['terminal_manual', 'stripe_auto'], default: 'terminal_manual' },
  lastBillingDate: Date,
  
  // Metadata
  notes: String,
  cancellationReason: String,
  cancellationDate: Date,
}, { timestamps: true, strict: false });

// Indexes for efficient queries
MembershipSchema.index({ customer: 1 });
MembershipSchema.index({ transaction: 1 });
MembershipSchema.index({ product: 1 });
MembershipSchema.index({ org: 1 });
MembershipSchema.index({ location: 1 });
MembershipSchema.index({ status: 1 });
MembershipSchema.index({ nextBillingDate: 1 });
MembershipSchema.index({ stripeSubscriptionId: 1 });
MembershipSchema.index({ subscriptionStartDate: 1 });

// Compound indexes for common queries
MembershipSchema.index({ customer: 1, status: 1 });
MembershipSchema.index({ org: 1, status: 1 });
MembershipSchema.index({ status: 1, nextBillingDate: 1 });

const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

export default Membership;