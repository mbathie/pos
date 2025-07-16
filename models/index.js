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

// ==== Employee ====
const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  hash: String,
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

// ==== Product ====
const ProductSchema = new mongoose.Schema({
  name: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  type: { type: String, enum: ['class', 'course','casual'] },
  duration: { name: Number, unit: String },
  capacity: Number,
  // prices: [{
  //   _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  // }],
  times: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    except: [String]
  }],
}, {
  timestamps: true,
  strict: false  // allow any additional fields
});

// Indexes for category, folder, and locations
ProductSchema.index({ category: 1 });
ProductSchema.index({ folder: 1 });
ProductSchema.index({ locations: 1 });
ProductSchema.index({ type: 1 });

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
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await Order.countDocuments({
    createdAt: { $gte: startOfDay }
  });

  this.orderNumber = count + 1;
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// ==== Updated Exports ====
module.exports = {
  Org,
  Location,
  Employee,
  Category,
  Product,
  Customer,
  Transaction,
  Folder,
  Schedule,
  Casual,
  Order,
};