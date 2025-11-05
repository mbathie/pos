#!/usr/bin/env node

/**
 * Create a test customer with signed waiver
 * Usage: node bin/create-test-customer.js [orgId]
 * Default orgId: 68ca833bfae95fc617d83d4f
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Get orgId from command line or use default
const DEFAULT_ORG_ID = '68ca833bfae95fc617d83d4f';
const orgIdArg = process.argv[2] || DEFAULT_ORG_ID;

// Import models
const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: {
    address1: String,
    city: String,
    state: String,
    postcode: String
  },
  dob: Date,
  gender: String,
  memberId: Number,
  orgs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Org' }],
  photo: String,
  assigned: Boolean,
  dependents: Array,
  waiver: {
    signed: Boolean,
    signature: String,
    agree: Boolean
  },
  credits: {
    balance: { type: Number, default: 0 },
    credits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Credit' }],
    debits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Debit' }]
  }
}, { timestamps: true });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

// Australian first and last names for variety
const firstNames = ['James', 'Sarah', 'Michael', 'Emma', 'Daniel', 'Olivia', 'Matthew', 'Sophie', 'Joshua', 'Emily', 'Ryan', 'Isabella', 'Jack', 'Chloe', 'Luke', 'Mia', 'Thomas', 'Ava', 'Benjamin', 'Charlotte'];
const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Roberts', 'Johnson', 'White', 'Martin', 'Thompson', 'Walker', 'Robinson', 'Lee', 'Harris', 'Clark', 'Lewis', 'Moore'];

// Australian cities and states
const australianLocations = [
  { city: 'Sydney', state: 'NSW', postcode: '2000' },
  { city: 'Melbourne', state: 'VIC', postcode: '3000' },
  { city: 'Brisbane', state: 'QLD', postcode: '4000' },
  { city: 'Perth', state: 'WA', postcode: '6000' },
  { city: 'Adelaide', state: 'SA', postcode: '5000' },
  { city: 'Gold Coast', state: 'QLD', postcode: '4217' },
  { city: 'Newcastle', state: 'NSW', postcode: '2300' },
  { city: 'Canberra', state: 'ACT', postcode: '2600' },
  { city: 'Sunshine Coast', state: 'QLD', postcode: '4558' },
  { city: 'Wollongong', state: 'NSW', postcode: '2500' },
  { city: 'Hobart', state: 'TAS', postcode: '7000' },
  { city: 'Geelong', state: 'VIC', postcode: '3220' },
  { city: 'Townsville', state: 'QLD', postcode: '4810' },
  { city: 'Cairns', state: 'QLD', postcode: '4870' },
  { city: 'Darwin', state: 'NT', postcode: '0800' },
  { city: 'Byron Bay', state: 'NSW', postcode: '2481' },
  { city: 'Ballina', state: 'NSW', postcode: '2478' },
  { city: 'Brunswick Heads', state: 'NSW', postcode: '2483' }
];

// Australian street names
const streetNames = [
  'Main Street', 'High Street', 'George Street', 'King Street', 'Queen Street',
  'Elizabeth Street', 'Collins Street', 'Bourke Street', 'Swanston Street',
  'Beach Road', 'Ocean Drive', 'Park Avenue', 'Victoria Road', 'Chapel Street',
  'Bridge Road', 'Bay Street', 'Smith Street', 'Brunswick Street', 'Sydney Road'
];

const genders = ['male', 'female', 'other'];

// Generate random Australian phone number
function generatePhone() {
  const areaCode = ['02', '03', '04', '07', '08'][Math.floor(Math.random() * 5)];
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `${areaCode}${number}`;
}

// Generate random date of birth (18-70 years old)
function generateDOB() {
  const now = new Date();
  const minAge = 18;
  const maxAge = 70;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const dob = new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  return dob;
}

// Generate a simple signature (base64 encoded SVG)
function generateSignature(name) {
  const svg = `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="50" font-family="cursive" font-size="24" fill="#000">${name}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Random number generator for email suffix
function generateEmailSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}

async function createTestCustomer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos');
    console.log('📦 Connected to MongoDB');

    // Get the organization
    const Org = mongoose.model('Org', new mongoose.Schema({}, { strict: false }));
    const org = await Org.findById(orgIdArg);

    if (!org) {
      console.error(`❌ Organization not found with ID: ${orgIdArg}`);
      process.exit(1);
    }

    console.log(`🏢 Using organization: ${org.name || orgIdArg}`);

    // Generate random customer data
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const emailSuffix = generateEmailSuffix();
    const email = `mbathie+${emailSuffix}@gmail.com`;
    const phone = generatePhone();
    const location = australianLocations[Math.floor(Math.random() * australianLocations.length)];
    const streetNumber = Math.floor(1 + Math.random() * 999);
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const address1 = `${streetNumber} ${streetName}`;
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const dob = generateDOB();

    // Get next member ID
    const lastCustomer = await Customer.findOne({ memberId: { $exists: true } })
      .sort({ memberId: -1 })
      .limit(1);
    const memberId = lastCustomer ? lastCustomer.memberId + 1 : 100000;

    // Create customer with signed waiver
    const customer = await Customer.create({
      name,
      email,
      phone,
      address: {
        address1,
        city: location.city,
        state: location.state,
        postcode: location.postcode
      },
      dob,
      gender,
      memberId,
      orgs: [org._id],
      assigned: false,
      dependents: [],
      waiver: {
        signed: true,
        signature: generateSignature(name),
        agree: true
      },
      credits: {
        balance: 0,
        credits: [],
        debits: []
      }
    });

    console.log('\n✅ Test customer created successfully!\n');
    console.log('📋 Customer Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:          ${customer._id}`);
    console.log(`Member ID:   ${customer.memberId}`);
    console.log(`Name:        ${customer.name}`);
    console.log(`Email:       ${customer.email}`);
    console.log(`Phone:       ${customer.phone}`);
    console.log(`Gender:      ${customer.gender}`);
    console.log(`DOB:         ${customer.dob.toISOString().split('T')[0]}`);
    console.log(`Address:     ${customer.address.address1}`);
    console.log(`             ${customer.address.city}, ${customer.address.state} ${customer.address.postcode}`);
    console.log(`Waiver:      ✓ Signed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test customer:', error);
    process.exit(1);
  }
}

createTestCustomer();
