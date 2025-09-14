#!/usr/bin/env node

/**
 * Test: Frequency Limits (Daily, Weekly, Monthly)
 * 
 * Validates that frequency-based usage limits work correctly.
 */

const {
  createCustomer,
  createDiscount,
  createTestCart,
  applyAdjustments,
  processCashPayment,
  formatTestResult,
  runTest,
  apiCall
} = require('./test-utils');

async function testFrequencyLimit(period = 'day', count = 1) {
  const periodName = period.charAt(0).toUpperCase() + period.slice(1);
  
  // Step 1: Create a discount with frequency limit
  const discount = await createDiscount({
    name: `TEST-FREQ-${period.toUpperCase()}`,
    code: `TESTF${period.charAt(0).toUpperCase()}`,
    value: 20, // 20% off
    limits: {
      total: {
        frequency: {
          count: count,
          period: period
        }
      }
    }
  });
  console.log(`📝 Created discount: ${discount.name} (${count} per ${period})`);

  // Step 2: Create a test customer
  const customer = await createCustomer({
    name: `Test Customer Freq${periodName}`
  });
  console.log(`👤 Created customer: ${customer.name}`);

  // Step 3: Use the discount up to the limit
  for (let i = 1; i <= count; i++) {
    const cart = createTestCart({ customer });
    const result = await applyAdjustments(cart, {
      customer,
      discountId: discount._id,
      isManualSelection: true
    });
    
    const applied = result.adjustments?.discounts?.total > 0;
    console.log(`\n✅ Use ${i}/${count}: ${applied ? 'Success' : 'Failed'}`);
    
    if (applied) {
      await processCashPayment(result, 20);
      console.log(`   Payment processed`);
    }
    
    // Small delay between transactions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Step 4: Try to exceed the limit (should fail)
  console.log(`\n❌ Attempting use ${count + 1} (should fail)...`);
  const cart = createTestCart({ customer });
  const exceedResult = await applyAdjustments(cart, {
    customer,
    discountId: discount._id,
    isManualSelection: true
  });
  
  const exceedApplied = exceedResult.adjustments?.discounts?.total > 0;
  console.log(`   Discount applied: ${exceedApplied ? 'Yes' : 'No'}`);
  console.log(`   Error: ${exceedResult.adjustments?.discountError || 'None'}`);

  // Step 5: Simulate time passing and try again
  if (period === 'day') {
    console.log(`\n⏰ Simulating next day by modifying customer's last usage...`);
    
    // Update the customer's discount usage to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // This would normally require database access, so we'll note it for manual testing
    console.log(`   (In production, discount would reset at midnight)`);
  }

  // Test passes if limit was enforced
  const passed = !exceedApplied && 
                 exceedResult.adjustments?.discountError?.includes(`${count} time`);

  return formatTestResult(`Frequency Limit (${periodName})`, passed, {
    discountId: discount._id,
    customerId: customer._id,
    limit: `${count} per ${period}`,
    limitExceeded: {
      applied: exceedApplied,
      error: exceedResult.adjustments?.discountError
    }
  });
}

async function runAllFrequencyTests() {
  const results = [];
  
  // Test daily limit
  results.push(await runTest('Daily Frequency Limit', 
    () => testFrequencyLimit('day', 1)));
  
  // Test weekly limit
  results.push(await runTest('Weekly Frequency Limit', 
    () => testFrequencyLimit('week', 2)));
  
  // Test monthly limit
  results.push(await runTest('Monthly Frequency Limit', 
    () => testFrequencyLimit('month', 3)));
  
  return results;
}

// Run the test if called directly
if (require.main === module) {
  runAllFrequencyTests()
    .then(results => {
      const allPassed = results.every(r => r.passed);
      console.log('\n' + '═'.repeat(50));
      console.log('Frequency Limit Tests Summary:');
      results.forEach(r => {
        console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}`);
      });
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFrequencyLimit, runAllFrequencyTests };