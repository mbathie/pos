import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema({
  // Core attributes
  name: { type: String, required: true },
  description: String,

  // Discount vs surcharge behavior (default discount for backwards-compat)
  mode: { type: String, enum: ['discount', 'surcharge'], default: 'discount' },

  // Public code guests can enter (discounts only)
  code: { type: String },

  // Auto-assignment flag for cart checkout
  autoAssign: { type: Boolean, default: false },

  // Must have products/categories (customer must be purchasing these)
  musts: {
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
  },

  // Multiple adjustments with their own products/categories
  adjustments: [{
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    adjustment: {
      type: { type: String, enum: ['percent', 'amount'], required: true },
      value: { type: Number, required: true },
      maxAmount: { type: Number }
    }
  }],

  // Limits and scheduling
  start: { type: Date },
  expiry: { type: Date },
  archivedAt: { type: Date },
  daysOfWeek: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: true },
    sunday: { type: Boolean, default: true }
  },
  limits: {
    total: {
      usageLimit: { type: Number }, // global usage cap
      frequency: {
        count: { type: Number },
        period: { type: String, enum: ['day', 'week', 'month', 'year'] }
      }
    },
    perCustomer: { type: Number } // lifetime per customer
  },
  
  // Require customer identification for this discount
  requireCustomer: { type: Boolean, default: false },

  // Ownership
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
DiscountSchema.index({ org: 1 });
// Unique constraint on org + name to prevent duplicate discount names within an organization
DiscountSchema.index({ org: 1, name: 1 }, { unique: true });
// Optional index for code lookups (non-unique since code is optional)
DiscountSchema.index({ org: 1, code: 1 }, { sparse: true });

const Discount = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);

export default Discount;
