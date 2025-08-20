import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  hash: String, // Password hash for customer login
  locked: Date, // Account lock status
  resetPasswordToken: String, // Password reset token (hashed)
  resetPasswordExpiry: Date, // Token expiry time
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

export default Customer;