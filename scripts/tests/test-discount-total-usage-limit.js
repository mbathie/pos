#!/usr/bin/env node

/**
 * Test: Total Usage Limit
 * 
 * Validates that discounts with total usage limits work across all customers.
 * Once the limit is reached, no customer should be able to use it.
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

async function testTotalUsageLimit() {
  // Step 1: Create a discount with total usage limit of 2
  const discount = await createDiscount({
    name: 'TEST-TOTAL-USAGE',
    code: 'TESTTU2',
    value: 15, // 15% off
    limits: {
      total: {
        usageLimit: 2 // Only 2 uses total across all customers
      }
    }
  });
  console.log(`📝 Created discount: ${discount.name} (total limit: 2 uses)`);

  // Step 2: Create first customer and use discount
  const customer1 = await createCustomer({
    name: 'Test Customer Total1'
  });
  console.log(`👤 Created customer 1: ${customer1.name}`);

  let cart = createTestCart({ customer: customer1 });
  const result1 = await applyAdjustments(cart, {
    customer: customer1,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const customer1Applied = result1.adjustments?.discounts?.total > 0;
  console.log(`\n1️⃣ Customer 1:`);
  console.log(`   Discount applied: ${customer1Applied ? 'Yes' : 'No'}`);
  console.log(`   Amount: $${result1.adjustments?.discounts?.total || 0}`);
  
  if (customer1Applied) {
    await processCashPayment(result1, 20);
    console.log(`   Payment processed`);
  }

  // Step 3: Create second customer and use discount
  const customer2 = await createCustomer({
    name: 'Test Customer Total2'
  });
  console.log(`\n👤 Created customer 2: ${customer2.name}`);

  cart = createTestCart({ customer: customer2 });
  const result2 = await applyAdjustments(cart, {
    customer: customer2,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const customer2Applied = result2.adjustments?.discounts?.total > 0;
  console.log(`\n2️⃣ Customer 2:`);
  console.log(`   Discount applied: ${customer2Applied ? 'Yes' : 'No'}`);
  console.log(`   Amount: $${result2.adjustments?.discounts?.total || 0}`);
  
  if (customer2Applied) {
    await processCashPayment(result2, 20);
    console.log(`   Payment processed`);
  }

  // Step 4: Create third customer - should fail (limit reached)
  const customer3 = await createCustomer({
    name: 'Test Customer Total3'
  });
  console.log(`\n👤 Created customer 3: ${customer3.name}`);

  cart = createTestCart({ customer: customer3 });
  const result3 = await applyAdjustments(cart, {
    customer: customer3,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const customer3Applied = result3.adjustments?.discounts?.total > 0;
  console.log(`\n3️⃣ Customer 3 (should be rejected):`);
  console.log(`   Discount applied: ${customer3Applied ? 'Yes' : 'No'}`);
  console.log(`   Error: ${result3.adjustments?.discountError || 'None'}`);

  // Test passes if first two succeeded and third failed
  const passed = customer1Applied && customer2Applied && !customer3Applied &&
                 result3.adjustments?.discountError?.includes('maximum usage limit');

  return formatTestResult('Total Usage Limit', passed, {
    discountId: discount._id,
    totalLimit: 2,
    customer1: {
      applied: customer1Applied,
      amount: result1.adjustments?.discounts?.total
    },
    customer2: {
      applied: customer2Applied,
      amount: result2.adjustments?.discounts?.total
    },
    customer3: {
      applied: customer3Applied,
      error: result3.adjustments?.discountError
    }
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Total Usage Limit', testTotalUsageLimit)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testTotalUsageLimit;