/**
 * Test data generator helpers
 */

/**
 * Generate a unique test email
 */
function generateTestEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test_${timestamp}_${random}@example.com`;
}

/**
 * Generate a unique organization name
 */
function generateOrgName() {
  const timestamp = Date.now();
  return `Test Cafe ${timestamp}`;
}

/**
 * Generate test user data
 */
function generateTestUser() {
  return {
    email: generateTestEmail(),
    password: 'TestPass123!',
    name: 'Test User',
    phone: '0412345678',
    orgName: generateOrgName(),
  };
}

/**
 * Product test data
 */
const testProducts = {
  flatWhite: {
    name: 'Flat White',
    category: 'Hot Drinks',
    basePrice: 5.50,
    milkOptions: [
      { name: 'Full Cream', price: 0 },
      { name: 'Skim', price: 0 },
      { name: 'Soy', price: 0.50 },
      { name: 'Almond', price: 0.80 },
      { name: 'Oat', price: 0.80 },
    ],
    sizeOptions: [
      { name: 'Small', price: -0.50 },
      { name: 'Regular', price: 0 },
      { name: 'Large', price: 1.00 },
    ],
    extras: [
      { name: 'Extra Shot', price: 0.60 },
      { name: 'Decaf', price: 0 },
      { name: 'Vanilla Syrup', price: 0.50 },
      { name: 'Caramel Syrup', price: 0.50 },
      { name: 'Extra Hot', price: 0 },
    ],
  },
};

module.exports = {
  generateTestEmail,
  generateOrgName,
  generateTestUser,
  testProducts,
};