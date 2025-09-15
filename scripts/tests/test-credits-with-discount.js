#!/usr/bin/env node

/**
 * Test credits combined with discount
 */

const { apiCall, createCustomer, createCart, createDiscount, cleanup } = require('./test-utils');

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
  
  // Recalculate totals with credits (applied after discounts)
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

async function testCreditsWithDiscount() {
  let testCustomer = null;
  let testDiscount = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Credit Discount Test Customer',
      email: `credit.discount${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 20.00, 'Test credit');
    
    // Create a 10% discount
    testDiscount = await createDiscount({
      name: 'Credit Test Discount',
      code: `CREDITDISC${Date.now()}`,
      value: 10, // 10% discount
      requireCustomer: true
    });
    
    // Create cart with discount applied
    const cart = await createCart({
      subtotal: 20.00,
      tax: 2.00,
      total: 22.00,
      customer: testCustomer,
      adjustments: {
        discounts: {
          items: [{
            id: testDiscount._id,
            name: testDiscount.name,
            amount: 2.00 // 10% of $20
          }],
          total: 2.00
        }
      }
    });
    
    // Process payment with credits
    // After discount: $18 subtotal, apply $5 credit = $13 taxable, tax = $1.30, total = $14.30
    const payment = await processCashPaymentWithCredits(cart, 5.00);
    const transaction = payment.transaction;
    
    if (Math.abs(transaction.total - 14.30) < 0.01 && Math.abs(transaction.tax - 1.30) < 0.01) {
      return {
        passed: true,
        details: 'Total: $14.30'
      };
    } else {
      return {
        passed: false,
        error: `Expected $14.30, got $${transaction.total}`
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
      } catch (e) {}
    }
    if (testDiscount) {
      try {
        await cleanup('discounts', testDiscount._id);
      } catch (e) {}
    }
  }
}

module.exports = testCreditsWithDiscount;

// Run if called directly
if (require.main === module) {
  testCreditsWithDiscount().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}