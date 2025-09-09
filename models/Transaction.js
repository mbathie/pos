import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  cart: mongoose.Schema.Types.Mixed,
  total: Number,
  subtotal: Number,
  tax: Number,
  // Unified adjustments structure
  adjustments: {
    discounts: {
      items: [{
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
        name: String,
        amount: Number
      }],
      total: Number
    },
    surcharges: {
      items: [{
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
        name: String,
        amount: Number
      }],
      total: Number
    }
  },
  stripe: mongoose.Schema.Types.Mixed,
  cash: mongoose.Schema.Types.Mixed,
  paymentMethod: String,
  status: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true, strict: false });

// Indexes for org, location, customer, employee
TransactionSchema.index({ org: 1 });
TransactionSchema.index({ location: 1 });
TransactionSchema.index({ customer: 1 });
TransactionSchema.index({ employee: 1 });
TransactionSchema.index({ status: 1 });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default Transaction;