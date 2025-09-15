#!/usr/bin/env node

/**
 * Test partial payment with credits
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

async function testPartialCreditPayment() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Partial Credit Test Customer',
      email: `credit.partial${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 20.00, 'Test credit');
    
    // Create cart
    const cart = await createCart({
      subtotal: 15.00,
      tax: 1.50,
      total: 16.50,
      customer: testCustomer
    });
    
    // Process payment with partial credits ($5)
    const payment = await processCashPaymentWithCredits(cart, 5.00);
    const transaction = payment.transaction;
    
    // After $5 credit, subtotal becomes $10, tax should be $1.00, total $11.00
    if (Math.abs(transaction.total - 11.00) < 0.01 && Math.abs(transaction.tax - 1.00) < 0.01) {
      return {
        passed: true,
        details: 'Total: $11'
      };
    } else {
      return {
        passed: false,
        error: `Expected $11 total, got $${transaction.total}`
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

module.exports = testPartialCreditPayment;

// Run if called directly
if (require.main === module) {
  testPartialCreditPayment().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}