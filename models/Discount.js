import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema({
  // Core attributes
  name: { type: String, required: true },
  description: String,

  // Discount vs surcharge behavior (default discount for backwards-compat)
  mode: { type: String, enum: ['discount', 'surcharge'], default: 'discount' },

  // Public code guests can enter (discounts only)
  code: { type: String },

  // Value type and amount
  type: { type: String, enum: ['percent', 'amount'], required: true },
  value: { type: Number, required: true },

  // Optional hard cap when using percent
  maxAmount: { type: Number },

  // 2-for-1 like promotions (discounts only)
  bogo: {
    enabled: { type: Boolean, default: false },
    buyQty: { type: Number, default: 2 },
    getQty: { type: Number, default: 1 },
    discountPercent: { type: Number, default: 50 },
  },

  // Limits and scheduling
  start: { type: Date },
  expiry: { type: Date },
  archivedAt: { type: Date },
  limits: {
    usageLimit: { type: Number }, // global usage cap
    perCustomer: {
      total: { type: Number }, // lifetime per customer
      frequency: {
        count: { type: Number },
        period: { type: String, enum: ['day', 'week', 'month', 'year'] },
      }
    }
  },

  // Applicability
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],

  // Ownership
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
DiscountSchema.index({ org: 1 });
// Optional uniqueness for codes within an org
DiscountSchema.index({ org: 1, code: 1 }, { unique: true, sparse: true });

const Discount = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);

export default Discount;
