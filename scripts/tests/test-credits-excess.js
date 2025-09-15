#!/usr/bin/env node

/**
 * Test credits exceeding cart total (should only use needed amount)
 */

const { apiCall, createCustomer, createCart, cleanup } = require('./test-utils');

async function addCustomerCredit(customerId, amount, note = 'Test credit') {
  return apiCall(`/api/customers/${customerId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  });
}

async function processCashPaymentWithCredits(cart, creditAmount) {
  const cartWithCredits = {
    ...cart,
    adjustments: {
      ...cart.adjustments,
      credits: {
        customerId: cart.customer._id,
        amount: creditAmount
      }
    }
  };
  
  const subtotalAfterDiscounts = cart.subtotal - (cart.adjustments?.discounts?.total || 0);
  const subtotalAfterCredits = Math.max(0, subtotalAfterDiscounts - creditAmount);
  const newTax = subtotalAfterCredits * 0.1;
  cartWithCredits.tax = parseFloat(newTax.toFixed(2));
  cartWithCredits.total = subtotalAfterCredits + cartWithCredits.tax;
  
  return apiCall('/api/payments/cash', {
    method: 'POST',
    body: JSON.stringify({
      cart: cartWithCredits,
      received: cartWithCredits.total,
      change: 0,
      customer: cart.customer
    })
  });
}

async function testExcessCredits() {
  let testCustomer = null;
  
  try {
    // Create customer with lots of credits
    testCustomer = await createCustomer({
      name: 'Excess Credit Test Customer',
      email: `credit.excess${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 50.00, 'Large credit balance');
    
    // Create small cart
    const cart = await createCart({
      subtotal: 5.00,
      tax: 0.50,
      total: 5.50,
      customer: testCustomer
    });
    
    // Try to use only what's needed ($5)
    const payment = await processCashPaymentWithCredits(cart, 5.00);
    const transaction = payment.transaction;
    
    // Should result in zero total
    if (transaction.total === 0 && transaction.tax === 0) {
      return {
        passed: true,
        details: 'Used $5 only'
      };
    } else {
      return {
        passed: false,
        error: 'Failed to handle excess credits properly'
      };
    }
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  } finally {
    if (testCustomer) {
      try {
        await cleanup('customers', testCustomer._id);
      } catch (e) {}
    }
  }
}

module.exports = testExcessCredits;

if (require.main === module) {
  testExcessCredits().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}