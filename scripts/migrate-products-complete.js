const { connectDB } = require('../lib/mongoose');
const { Product, Category, POSInterface } = require('../models');

async function migrateAllProducts() {
  await connectDB();

  console.log('Starting complete product migration...');
  console.log('Migrating all products to have org field...\n');

  // Find all products without org
  const productsWithoutOrg = await Product.find({
    $or: [
      { org: null },
      { org: { $exists: false } }
    ]
  }).lean();

  console.log(`Found ${productsWithoutOrg.length} products without org field`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Get all POS interfaces for fallback org lookup
  const posInterfaces = await POSInterface.find({}).lean();

  for (const product of productsWithoutOrg) {
    try {
      let orgId = null;

      // Method 1: Get org from category
      if (product.category) {
        const category = await Category.findById(product.category).lean();
        if (category && category.org) {
          orgId = category.org;
          console.log(`  ✓ Product ${product._id} (${product.name}) - org from category`);
        }
      }

      // Method 2: Get org from POS interface
      if (!orgId) {
        for (const posInterface of posInterfaces) {
          for (const category of posInterface.categories || []) {
            const itemInCategory = category.items?.find(item =>
              String(item.itemId) === String(product._id)
            );
            if (itemInCategory) {
              orgId = posInterface.org;
              console.log(`  ✓ Product ${product._id} (${product.name}) - org from POS interface`);
              break;
            }
          }
          if (orgId) break;
        }
      }

      // Update product with org
      if (orgId) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { org: orgId } }
        );
        migratedCount++;
      } else {
        console.log(`  ⚠️  Product ${product._id} (${product.name}) - could not find org (skipping)`);
        skippedCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error migrating product ${product._id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`✓ Successfully migrated: ${migratedCount} products`);
  if (skippedCount > 0) {
    console.log(`⊘ Skipped (no org found): ${skippedCount} products`);
  }
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount} products`);
  }

  // Check remaining products without org
  const remainingWithoutOrg = await Product.countDocuments({
    $or: [
      { org: null },
      { org: { $exists: false } }
    ]
  });

  if (remainingWithoutOrg > 0) {
    console.log(`\n⚠️  Warning: ${remainingWithoutOrg} products still have no org!`);
    console.log('These products may need manual assignment.');
  } else {
    console.log('\n✓ All products now have an org field!');
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrateAllProducts().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
