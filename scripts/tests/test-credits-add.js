#!/usr/bin/env node

/**
 * Test adding credits to customer
 */

const { apiCall, createCustomer, cleanup } = require('./test-utils');

async function addCustomerCredit(customerId, amount, note = 'Test credit') {
  return apiCall(`/api/customers/${customerId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  });
}

async function testAddCredits() {
  let testCustomer = null;
  
  try {
    // Create test customer
    testCustomer = await createCustomer({
      name: 'Credit Add Test Customer',
      email: `credit.add${Date.now()}@test.com`
    });
    
    // Add credits
    const creditAmount = 20.00;
    const updatedCustomer = await addCustomerCredit(testCustomer._id, creditAmount, 'Initial test credit');
    
    // Verify credits were added
    if (updatedCustomer.credits?.balance === creditAmount) {
      return {
        passed: true,
        details: `Added $${creditAmount}`
      };
    } else {
      return {
        passed: false,
        error: 'Failed to add credits'
      };
    }
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  } finally {
    // Cleanup
    if (testCustomer) {
      try {
        await cleanup('customers', testCustomer._id);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = testAddCredits;

// Run if called directly
if (require.main === module) {
  testAddCredits().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}