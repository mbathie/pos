#!/usr/bin/env node

/**
 * Test zero-dollar transaction with full credit coverage
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

async function testZeroDollarTransaction() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Zero Dollar Test Customer',
      email: `credit.zero${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 20.00, 'Test credit');
    
    // Create small cart
    const cart = await createCart({
      subtotal: 3.50,
      tax: 0.35,
      total: 3.85,
      customer: testCustomer
    });
    
    // Use credits to cover full amount
    const payment = await processCashPaymentWithCredits(cart, 3.50);
    const transaction = payment.transaction;
    
    // Should result in zero dollar transaction
    if (transaction.total === 0 && transaction.tax === 0) {
      return {
        passed: true,
        details: 'Credits only'
      };
    } else {
      return {
        passed: false,
        error: `Expected $0 total, got $${transaction.total}`
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

module.exports = testZeroDollarTransaction;

if (require.main === module) {
  testZeroDollarTransaction().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}