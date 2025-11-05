const { connectDB } = require('../lib/mongoose');
const { Product, Category } = require('../models');

async function migrateProducts() {
  await connectDB();

  console.log('Starting product migration...');
  console.log('Migrating products to connect directly to org...\n');

  // Find all products that have a category but no org (or null org)
  // Use lean() to get raw data since category is not in schema anymore
  const productsNeedingMigration = await Product.find({
    $or: [
      { org: null },
      { org: { $exists: false } }
    ],
    category: { $exists: true, $ne: null }
  }).lean();

  console.log(`Found ${productsNeedingMigration.length} products needing migration`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const product of productsNeedingMigration) {
    try {
      if (!product.category) {
        console.log(`  ⚠️  Product ${product._id} (${product.name}) has category ID but category not found`);
        errorCount++;
        continue;
      }

      // Fetch the category to get the org
      const category = await Category.findById(product.category).lean();

      if (!category) {
        console.log(`  ⚠️  Product ${product._id} (${product.name}) - category ${product.category} not found in database`);
        errorCount++;
        continue;
      }

      if (!category.org) {
        console.log(`  ⚠️  Product ${product._id} (${product.name}) - category ${category.name} has no org`);
        errorCount++;
        continue;
      }

      // Update the product to have the org from its category
      await Product.updateOne(
        { _id: product._id },
        { $set: { org: category.org } }
      );

      migratedCount++;
      if (migratedCount % 10 === 0) {
        console.log(`  Migrated ${migratedCount} products...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating product ${product._id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`✓ Successfully migrated: ${migratedCount} products`);
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount} products`);
  }

  // Now check all products to see if any still have null org
  const productsWithoutOrg = await Product.countDocuments({
    $or: [
      { org: null },
      { org: { $exists: false } }
    ]
  });

  if (productsWithoutOrg > 0) {
    console.log(`\n⚠️  Warning: ${productsWithoutOrg} products still have no org!`);
    console.log('These products may need manual intervention.');
  } else {
    console.log('\n✓ All products now have an org field!');
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrateProducts().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
