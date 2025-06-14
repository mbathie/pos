const mongooseDelete = require('mongoose-delete');
const mongoose = require('mongoose');

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
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// ==== Product ====
const ProductSchema = new mongoose.Schema({
  name: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  type: { type: String, enum: ['class', 'course'] },
  duration: { name: Number, unit: String },
  capacity: Number,
  prices: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  }],
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

// ==== Updated Exports ====
module.exports = {
  Org,
  Location,
  Employee,
  Category,
  Product,
  Customer,
  Transaction,
};