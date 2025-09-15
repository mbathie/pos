#!/usr/bin/env node

/**
 * Test full payment with credits (no remaining balance)
 */

const { apiCall, createCustomer, createCart, cleanup } = require('./test-utils');

async function addCustomerCredit(customerId, amount, note = 'Test credit') {
  return apiCall(`/api/customers/${customerId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  });
}

async function processCashPaymentWithCredits(cart, creditAmount) {
  // Apply credits to cart
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
  
  // Recalculate totals with credits
  const subtotalAfterDiscounts = cart.subtotal - (cart.adjustments?.discounts?.total || 0);
  const subtotalAfterCredits = Math.max(0, subtotalAfterDiscounts - creditAmount);
  const newTax = subtotalAfterCredits * 0.1; // 10% GST
  cartWithCredits.tax = parseFloat(newTax.toFixed(2));
  cartWithCredits.total = subtotalAfterCredits + cartWithCredits.tax;
  
  // Process cash payment
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

async function testFullCreditPayment() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Full Credit Test Customer',
      email: `credit.full${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 20.00, 'Test credit');
    
    // Create cart
    const cart = await createCart({
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00,
      customer: testCustomer
    });
    
    // Process payment with credits covering full amount
    const payment = await processCashPaymentWithCredits(cart, 10.00);
    const transaction = payment.transaction;
    
    // Verify payment was processed with zero total
    if (transaction.total === 0 && transaction.tax === 0 && transaction.adjustments?.credits?.amount === 10.00) {
      return {
        passed: true,
        details: 'Total: $0, Tax: $0'
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

module.exports = testFullCreditPayment;

// Run if called directly
if (require.main === module) {
  testFullCreditPayment().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}