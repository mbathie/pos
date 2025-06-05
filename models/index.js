const mongooseDelete = require('mongoose-delete');
const mongoose = require('mongoose');

// ==== Org ====
const OrgSchema = new mongoose.Schema({
  name: String,
  phone: String,
}, { timestamps: true });

const Org = mongoose.models.Org || mongoose.model('Org', OrgSchema);

// ==== Location ====
const LocationSchema = new mongoose.Schema({
  name: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
}, { timestamps: true });

const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);

// ==== Employee ====
const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  hash: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'STAFF', 'TERMINAL'] },
}, { timestamps: true });

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

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

// ==== Category ====
const CategorySchema = new mongoose.Schema({
  name: String,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
}, { timestamps: true });

CategorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
});

CategorySchema.set('toObject', { virtuals: true });
CategorySchema.set('toJSON', { virtuals: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// ==== Exports ====
module.exports = {
  Org,
  Location,
  Employee,
  Product,
  Category
};