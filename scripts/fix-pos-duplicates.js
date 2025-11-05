const { connectDB } = require('../lib/mongoose');
const { POSInterface } = require('../models');

async function fixDuplicates() {
  await connectDB();

  console.log('Finding POS interfaces with duplicate items...');

  const interfaces = await POSInterface.find({});

  for (const posInterface of interfaces) {
    let hasChanges = false;

    for (const category of posInterface.categories) {
      if (!category.items || category.items.length === 0) continue;

      const seenIds = new Set();
      const uniqueItems = [];

      for (const item of category.items) {
        const itemIdStr = String(item.itemId);

        if (seenIds.has(itemIdStr)) {
          console.log(`  Found duplicate in category "${category.name}": ${itemIdStr}`);
          hasChanges = true;
          continue; // Skip duplicate
        }

        seenIds.add(itemIdStr);
        uniqueItems.push(item);
      }

      if (hasChanges) {
        // Reassign order numbers
        uniqueItems.forEach((item, index) => {
          item.order = index;
        });
        category.items = uniqueItems;
      }
    }

    if (hasChanges) {
      console.log(`Saving changes to POS interface: ${posInterface.name}`);
      await posInterface.save();
    }
  }

  console.log('Done!');
  process.exit(0);
}

fixDuplicates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
