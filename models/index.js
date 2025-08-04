const mongooseDelete = require('mongoose-delete');
const mongoose = require('mongoose');
const { Schema } = require('zod');

// ==== Org ====
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

// ==== Location ====
const LocationSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: mongoose.Schema.Types.Mixed,
  hours: mongoose.Schema.Types.Mixed,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
}, { timestamps: true, strict: false });

// Index for org reference
LocationSchema.index({ org: 1 });

const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);

// ==== Terminal ====
const TerminalSchema = new mongoose.Schema({
  label: { type: String, required: true },
  stripeTerminalId: String,
  registrationCode: String,
  type: { type: String, enum: ['simulated', 'physical'], default: 'simulated' },
  status: { type: String, enum: ['online', 'offline', 'unknown'], default: 'unknown' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  browser: String, // Unique browser ID for terminal-browser linking
  lastSeen: Date,
  serialNumber: String,
  deviceType: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Indexes for org, location, and stripeTerminalId references
TerminalSchema.index({ org: 1 });
TerminalSchema.index({ location: 1 });
TerminalSchema.index({ stripeTerminalId: 1 });

const Terminal = mongoose.models.Terminal || mongoose.model('Terminal', TerminalSchema);

// ==== Employee ====
const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  hash: String,
  pin: Number,
  locked: Date,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'STAFF', 'TERMINAL'] },
}, { timestamps: true, strict: false });

// Indexes for org and location
EmployeeSchema.index({ org: 1 });
EmployeeSchema.index({ location: 1 });

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

// ==== Category ====
const CategorySchema = new mongoose.Schema({
  name: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  menu: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

// Index for org reference
CategorySchema.index({ org: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// ==== Folder ====
const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
}, { timestamps: true });

// Index for org reference
FolderSchema.index({ org: 1 });

const Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);

// ==== Accounting ====
const AccountingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  tax: { type: Boolean, default: false },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
AccountingSchema.index({ org: 1 });
AccountingSchema.index({ code: 1, org: 1 }, { unique: true });

const Accounting = mongoose.models.Accounting || mongoose.model('Accounting', AccountingSchema);

// ==== Product ====
const ProductSchema = new mongoose.Schema({
  name: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  accounting: { type: mongoose.Schema.Types.ObjectId, ref: 'Accounting' },
  type: { type: String, enum: ['class', 'course', 'casual', 'membership'] },
  duration: { name: Number, unit: String },
  capacity: Number,
  bump: { type: Boolean, default: false },
  // times: [{
  //   _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  //   except: [String]
  // }],
}, {
  timestamps: true,
  strict: false  // allow any additional fields
});

// Indexes for category, folder, locations, and accounting
ProductSchema.index({ category: 1 });
ProductSchema.index({ folder: 1 });
ProductSchema.index({ locations: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ accounting: 1 });

ProductSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ==== Customer ====
const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  dob: Date,
  gender: String,
  orgs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Org' }],
  memberId: {
    type: Number,
    unique: true,
    sparse: true,
  },
}, { timestamps: true, strict: false });

// Index for orgs array
CustomerSchema.index({ orgs: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ phone: 1 });

CustomerSchema.pre('save', async function (next) {
  if (this.memberId) return next();

  const Customer = mongoose.model('Customer');
  let unique = false;

  while (!unique) {
    const id = Math.floor(100000 + Math.random() * 900000);
    const existing = await Customer.findOne({ memberId: id });
    if (!existing) {
      this.memberId = id;
      unique = true;
    }
  }

  next();
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

// ==== Transaction ====
const TransactionSchema = new mongoose.Schema({
  cart: mongoose.Schema.Types.Mixed,
  total: Number,
  subtotal: Number,
  tax: Number,
  discountAmount: Number,
  discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
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

// ==== Schedule ====
const ScheduleSchema = new mongoose.Schema({
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  capacity: Number,
  available: {
    type: Number,
    default: 0,
  },
  locations: [{
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    classes: [{
      datetime: { type: Date, required: true },
      duration: Number,
      available: Number,
      customers: [{
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
        status: { type: String, enum: ['confirmed', 'cancelled', 'checked in'] },
        transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
      }]
    }]
  }]
}, { timestamps: true, strict: false });

// Compound index for org and product
ScheduleSchema.index({ org: 1, product: 1 });

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);

// ==== Casual ====
const CasualSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date },
  hours: { type: Number },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true, strict: false });

// Indexes for org, product, customer, location
CasualSchema.index({ org: 1 });
CasualSchema.index({ product: 1 });
CasualSchema.index({ customer: 1 });
CasualSchema.index({ location: 1 });

const Casual = mongoose.models.Casual || mongoose.model('Casual', CasualSchema);

// ==== Order ====
const OrderSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  status: { type: String, enum: ['placed', 'cancelled', 'completed'], default: 'Placed' },
  products: [{
    _id: false,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number },
    name: String,
    item: mongoose.Schema.Types.Mixed,
  }]
}, { timestamps: true, strict: false });

// Indexes for transaction, location, customer, status
OrderSchema.index({ transaction: 1 });
OrderSchema.index({ location: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderNumber: 1 });

OrderSchema.add({
  orderNumber: Number,
});

OrderSchema.pre('save', async function (next) {
  if (this.orderNumber) return next();

  const Order = mongoose.model('Order');
  // Set startOfWeek to most recent Sunday at midnight
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - dayOfWeek;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  const count = await Order.countDocuments({
    createdAt: { $gte: startOfWeek }
  });

  this.orderNumber = count + 1;
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// ==== Discount ====
const DiscountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
  type: { type: String, enum: ['percent', 'amount'], required: true },
  expiry: { type: Date },
  description: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
}, { timestamps: true });

// Index for org reference
DiscountSchema.index({ org: 1 });

const Discount = mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);

// ==== Membership ====
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

// ==== Updated Exports ====
module.exports = {
  Org,
  Location,
  Terminal,
  Employee,
  Category,
  Product,
  Customer,
  Transaction,
  Folder,
  Schedule,
  Casual,
  Order,
  Accounting,
  Discount,
  Membership,
};

export {
  Org, Location, Terminal, Employee, Customer, Category, Folder, Accounting, Product, Discount, Transaction, Schedule, Casual, Order, Membership
}