// Fix membership products with string category IDs
import { connectDB } from '../lib/mongoose.js';
import { Product } from '../models/index.js';
import mongoose from 'mongoose';

async function fixMembershipCategories() {
  await connectDB();

  // Find products with category as string
  const products = await Product.find({
    type: 'membership',
    deleted: { $ne: true }
  });

  console.log(`Found ${products.length} membership products`);

  for (const product of products) {
    const categoryValue = product.category;

    // Check if category is a string
    if (typeof categoryValue === 'string') {
      // Convert string to ObjectId
      product.category = new mongoose.Types.ObjectId(categoryValue);
      await product.save();
      console.log(`✅ Fixed category for: ${product.name} (${product._id})`);
      console.log(`   Changed from: "${categoryValue}" (string)`);
      console.log(`   Changed to: ObjectId("${product.category}")`);
    } else {
      console.log(`ℹ️ ${product.name} already has ObjectId category`);
    }
  }

  console.log('✅ Migration complete');
  process.exit(0);
}

fixMembershipCategories().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
