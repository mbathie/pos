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

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

// ==== Category ====
const CategorySchema = new mongoose.Schema({
  name: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  menu: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// ==== Folder ====
const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
}, { timestamps: true });

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

ProductSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: 'all' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ==== Customer ====
const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  orgs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Org' }],
}, { timestamps: true, strict: false });

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

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

// ==== Schedule ====
const ScheduleSchema = new mongoose.Schema({
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' }, // only for classes
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  capacity: Number,
  available: {
    type: Number,
    default: 0,
  },
  classes: [{
    datetime: { type: Date, required: true },
    duration: Number,
    available: Number,
    customers: [{
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
      status: { type: String, enum: ['confirmed', 'cancelled', 'checkedin'] },
      transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
    }]
  }]
}, { timestamps: true, strict: false });


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

const Casual = mongoose.models.Casual || mongoose.model('Casual', CasualSchema);

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
};