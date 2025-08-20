import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  hash: String,
  pin: Number,
  lastPin: Date, // Last time PIN was entered (for 5-minute timeout)
  locked: Date,
  org: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'STAFF', 'TERMINAL'] },
}, { timestamps: true, strict: false });

// Indexes for org and location
EmployeeSchema.index({ org: 1 });
EmployeeSchema.index({ location: 1 });

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

export default Employee;