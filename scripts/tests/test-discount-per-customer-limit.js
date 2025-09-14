#!/usr/bin/env node

/**
 * Test: Per-Customer Usage Limit
 * 
 * Validates that discounts with per-customer limits are properly enforced.
 * A customer should not be able to use a discount more than the specified limit.
 */

const {
  createCustomer,
  createDiscount,
  createTestCart,
  applyAdjustments,
  processCashPayment,
  formatTestResult,
  runTest
} = require('./test-utils');

async function testPerCustomerLimit() {
  // Step 1: Create a discount with per-customer limit of 1
  const discount = await createDiscount({
    name: 'TEST-PER-CUSTOMER-LIMIT',
    code: 'TESTPC1',
    value: 10, // 10% off
    limits: {
      perCustomer: 1 // Each customer can only use once
    }
  });
  console.log(`📝 Created discount: ${discount.name} (limit: 1 per customer)`);

  // Step 2: Create a test customer
  const customer = await createCustomer({
    name: 'Test Customer PerLimit'
  });
  console.log(`👤 Created customer: ${customer.name}`);

  // Step 3: Create a cart and apply the discount (first use)
  let cart = createTestCart({ customer });
  console.log(`🛒 Created cart with total: $${cart.total}`);

  // Apply discount for the first time
  const result1 = await applyAdjustments(cart, {
    customer,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const discount1Applied = result1.adjustments?.discounts?.total > 0;
  console.log(`\n1️⃣ First attempt:`);
  console.log(`   Discount applied: ${discount1Applied ? 'Yes' : 'No'}`);
  console.log(`   Discount amount: $${result1.adjustments?.discounts?.total || 0}`);
  console.log(`   New total: $${result1.total}`);

  // Step 4: Process the payment to record the usage
  if (discount1Applied) {
    await processCashPayment(result1, 20);
    console.log(`💰 Payment processed - discount usage recorded`);
  }

  // Step 5: Try to use the discount again (should fail)
  await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
  
  cart = createTestCart({ customer });
  const result2 = await applyAdjustments(cart, {
    customer,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const discount2Applied = result2.adjustments?.discounts?.total > 0;
  console.log(`\n2️⃣ Second attempt:`);
  console.log(`   Discount applied: ${discount2Applied ? 'Yes' : 'No'}`);
  console.log(`   Error: ${result2.adjustments?.discountError || 'None'}`);

  // Test passes if first use succeeded and second use failed
  const passed = discount1Applied && !discount2Applied && 
                 result2.adjustments?.discountError?.includes('already used');

  return formatTestResult('Per-Customer Limit', passed, {
    discountId: discount._id,
    customerId: customer._id,
    firstUse: {
      applied: discount1Applied,
      amount: result1.adjustments?.discounts?.total
    },
    secondUse: {
      applied: discount2Applied,
      error: result2.adjustments?.discountError
    }
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Per-Customer Limit', testPerCustomerLimit)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testPerCustomerLimit;