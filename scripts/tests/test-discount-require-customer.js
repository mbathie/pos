#!/usr/bin/env node

/**
 * Test: Require Customer
 * 
 * Validates that discounts with "requireCustomer" flag only work when a customer is selected.
 */

const {
  createCustomer,
  createDiscount,
  createTestCart,
  applyAdjustments,
  formatTestResult,
  runTest
} = require('./test-utils');

async function testRequireCustomer() {
  // Step 1: Create a discount that requires customer
  const discount = await createDiscount({
    name: 'TEST-REQUIRE-CUSTOMER',
    code: 'TESTRC',
    value: 25, // 25% off
    requireCustomer: true
  });
  console.log(`📝 Created discount: ${discount.name} (requires customer)`);

  // Step 2: Try to apply discount WITHOUT a customer (should fail)
  console.log(`\n🚫 Testing without customer...`);
  let cart = createTestCart(); // No customer
  const resultNoCustomer = await applyAdjustments(cart, {
    discountId: discount._id,
    isManualSelection: true
  });
  
  const noCustomerApplied = resultNoCustomer.adjustments?.discounts?.total > 0;
  console.log(`   Discount applied: ${noCustomerApplied ? 'Yes' : 'No'}`);
  console.log(`   Error: ${resultNoCustomer.adjustments?.discountError || 'None'}`);

  // Step 3: Create a customer and try again (should succeed)
  const customer = await createCustomer({
    name: 'Test Customer RequireCustomer'
  });
  console.log(`\n👤 Created customer: ${customer.name}`);
  
  console.log(`✅ Testing with customer...`);
  cart = createTestCart({ customer });
  const resultWithCustomer = await applyAdjustments(cart, {
    customer,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const withCustomerApplied = resultWithCustomer.adjustments?.discounts?.total > 0;
  console.log(`   Discount applied: ${withCustomerApplied ? 'Yes' : 'No'}`);
  console.log(`   Discount amount: $${resultWithCustomer.adjustments?.discounts?.total || 0}`);

  // Test passes if discount failed without customer and succeeded with customer
  const passed = !noCustomerApplied && 
                 withCustomerApplied &&
                 resultNoCustomer.adjustments?.discountError?.includes('requires customer');

  return formatTestResult('Require Customer', passed, {
    discountId: discount._id,
    withoutCustomer: {
      applied: noCustomerApplied,
      error: resultNoCustomer.adjustments?.discountError
    },
    withCustomer: {
      applied: withCustomerApplied,
      amount: resultWithCustomer.adjustments?.discounts?.total,
      customerId: customer._id
    }
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Require Customer', testRequireCustomer)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testRequireCustomer;