// Script to seed sample ModGroups and Mods for testing
// Run with: node scripts/seed-mods.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after dotenv is configured
const ModGroup = require('../models/ModGroup').default;
const Mod = require('../models/Mod').default;

const ORG_ID = '689f13f0cb0754341e093d78';

const sampleModGroups = [
  {
    name: 'Milk',
    allowMultiple: false,
    required: false,
    order: 0,
    mods: [
      { name: 'Regular', price: 0, isDefault: true, order: 0 },
      { name: 'Oat', price: 0.75, order: 1 },
      { name: 'Soy', price: 0.50, order: 2 },
      { name: 'Almond', price: 0.75, order: 3 },
      { name: 'Coconut', price: 0.75, order: 4 },
      { name: 'Skim', price: 0, order: 5 },
      { name: '2%', price: 0, order: 6 },
    ]
  },
  {
    name: 'Syrups',
    allowMultiple: true,
    required: false,
    order: 1,
    mods: [
      { name: 'Vanilla', price: 0.50, order: 0 },
      { name: 'Caramel', price: 0.50, order: 1 },
      { name: 'Hazelnut', price: 0.50, order: 2 },
      { name: 'Chocolate', price: 0.50, order: 3 },
      { name: 'Sugar Free Vanilla', price: 0.50, order: 4 },
      { name: 'Sugar Free Caramel', price: 0.50, order: 5 },
      { name: 'Peppermint', price: 0.50, order: 6 },
      { name: 'Toffee Nut', price: 0.50, order: 7 },
    ]
  },
  {
    name: 'Strength + Fullness',
    allowMultiple: true,
    required: false,
    order: 2,
    mods: [
      { name: 'Extra Shot', price: 1.00, order: 0 },
      { name: 'Decaf', price: 0, order: 1 },
      { name: 'Half Caff', price: 0, order: 2 },
      { name: '1/2 strength', price: 0, order: 3 },
      { name: '1/2 Full', price: 0, order: 4 },
      { name: '2/3 Full', price: 0, order: 5 },
    ]
  },
  {
    name: 'Sugars',
    allowMultiple: true,
    required: false,
    order: 3,
    mods: [
      { name: 'Sugar', price: 0, order: 0 },
      { name: 'Raw Sugar', price: 0, order: 1 },
      { name: 'Honey', price: 0.75, order: 2 },
      { name: 'Stevia', price: 0, order: 3 },
      { name: 'Equal', price: 0, order: 4 },
      { name: 'Splenda', price: 0, order: 5 },
      { name: '1/2 Sugar', price: 0, order: 6 },
      { name: '1/2 Sweetener', price: 0, order: 7 },
    ]
  },
  {
    name: 'Temperature',
    allowMultiple: false,
    required: false,
    order: 4,
    mods: [
      { name: 'Hot', price: 0, isDefault: true, order: 0 },
      { name: 'Iced', price: 0, order: 1 },
      { name: 'Extra Hot', price: 0, order: 2 },
      { name: 'Warm', price: 0, order: 3 },
      { name: 'Kids Temp', price: 0, order: 4 },
      { name: 'Volcanic', price: 1.00, order: 5 },
    ]
  },
  {
    name: 'Size',
    allowMultiple: false,
    required: true,
    order: 5,
    mods: [
      { name: 'Small', price: 0, order: 0 },
      { name: 'Medium', price: 1.00, isDefault: true, order: 1 },
      { name: 'Large', price: 2.00, order: 2 },
      { name: 'Extra Large', price: 3.00, order: 3 },
    ]
  },
  {
    name: 'Extras',
    allowMultiple: true,
    required: false,
    order: 6,
    mods: [
      { name: 'Whipped Cream', price: 0.50, order: 0 },
      { name: 'Extra Foam', price: 0, order: 1 },
      { name: 'No Foam', price: 0, order: 2 },
      { name: 'Light Foam', price: 0, order: 3 },
      { name: 'Extra Ice', price: 0, order: 4 },
      { name: 'Light Ice', price: 0, order: 5 },
      { name: 'No Ice', price: 0, order: 6 },
      { name: 'Cinnamon', price: 0, order: 7 },
      { name: 'Nutmeg', price: 0, order: 8 },
      { name: 'Chocolate Drizzle', price: 0.50, order: 9 },
      { name: 'Caramel Drizzle', price: 0.50, order: 10 },
    ]
  }
];

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function seedModsData() {
  try {
    await connectDB();

    // Check if org exists (we're just using the ID directly for seeding)
    console.log(`Seeding data for org: ${ORG_ID}`);

    // Clear existing data for this org
    await ModGroup.deleteMany({ org: ORG_ID });
    await Mod.deleteMany({ org: ORG_ID });
    console.log('Cleared existing mod data');

    // Create ModGroups and their Mods
    for (const groupData of sampleModGroups) {
      const { mods, ...groupInfo } = groupData;
      
      // Create the ModGroup
      const modGroup = await ModGroup.create({
        ...groupInfo,
        org: ORG_ID,
        active: true,
        deleted: false
      });
      
      console.log(`Created ModGroup: ${modGroup.name}`);
      
      // Create Mods for this group
      for (const modData of mods) {
        const mod = await Mod.create({
          ...modData,
          modGroup: modGroup._id,
          org: ORG_ID,
          active: true,
          deleted: false
        });
        console.log(`  - Added mod: ${mod.name} ($${mod.price})`);
      }
    }

    console.log('\n✅ Sample data created successfully!');
    console.log(`Created ${sampleModGroups.length} ModGroups with their modifications`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed function
seedModsData();