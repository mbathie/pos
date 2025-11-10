// Fix customers created via schedule waiver that have 'org' instead of 'orgs'
import { connectDB } from '../lib/mongoose.js';
import { Customer } from '../models/index.js';

async function fixCustomerOrgs() {
  await connectDB();

  // Find all customers with 'org' field but empty 'orgs' array
  const customers = await Customer.find({
    org: { $exists: true },
    $or: [
      { orgs: { $exists: false } },
      { orgs: { $size: 0 } }
    ]
  });

  console.log(`Found ${customers.length} customers to fix`);

  for (const customer of customers) {
    if (customer.org) {
      customer.orgs = [customer.org];
      await customer.save();
      console.log(`✅ Fixed customer: ${customer.name} (${customer._id})`);
    }
  }

  console.log('✅ Migration complete');
  process.exit(0);
}

fixCustomerOrgs().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
