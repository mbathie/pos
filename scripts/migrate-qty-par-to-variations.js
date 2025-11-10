/**
 * Migration Script: Move qty and par from product level to variation level
 *
 * This script:
 * 1. Fetches all shop products from the database
 * 2. Moves qty and par from product level to each variation
 * 3. If a product has no variations, creates a default variation
 * 4. Updates the products in the database
 */

const { connectDB } = require('../lib/mongoose');
const { Product } = require('../models');

async function migrateQtyParToVariations() {
  await connectDB();
  console.log('Starting qty/par migration to variations...\n');

  // Find all shop products using lean() to get raw data
  const products = await Product.find({ type: 'shop' }).lean();
  console.log(`Found ${products.length} shop products to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Check if product already has qty/par in variations
      const hasVariationQtyPar = product.variations?.some(v =>
        v.hasOwnProperty('qty') || v.hasOwnProperty('par')
      );

      if (hasVariationQtyPar) {
        console.log(`  ⊘ Skipping "${product.name}" - already migrated`);
        skipped++;
        continue;
      }

      // Get product-level qty and par (default to 0 if not set)
      const productQty = product.qty || 0;
      const productPar = product.par || 0;

      let newVariations;

      // If product has no variations, create a default one
      if (!product.variations || product.variations.length === 0) {
        newVariations = [{
          name: 'Default',
          amount: 0,
          qty: productQty,
          par: productPar
        }];
      } else {
        // Add qty and par to each existing variation
        newVariations = product.variations.map(variation => ({
          name: variation.name || '',
          amount: variation.amount || 0,
          value: variation.value || '',
          qty: productQty,
          par: productPar
        }));
      }

      // Update the product: add qty/par to variations and remove from product level
      await Product.updateOne(
        { _id: product._id },
        {
          $set: { variations: newVariations },
          $unset: { qty: '', par: '' }
        }
      );

      console.log(`  ✓ Migrated "${product.name}" - ${newVariations.length} variation(s)`);
      migrated++;
    } catch (error) {
      console.error(`  ✗ Error migrating "${product.name}":`, error.message);
      errors++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`✓ Successfully migrated: ${migrated} products`);
  console.log(`⊘ Skipped: ${skipped} products`);
  if (errors > 0) {
    console.log(`✗ Errors: ${errors} products`);
  }
  console.log('=========================\n');

  console.log('Migration complete!');
  process.exit(0);
}

migrateQtyParToVariations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
