#!/usr/bin/env node

/**
 * Test customer balance updates after credit usage
 */

const { apiCall, createCustomer, createCart, cleanup } = require('./test-utils');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addCustomerCredit(customerId, amount, note = 'Test credit') {
  return apiCall(`/api/customers/${customerId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  });
}

async function getCustomer(customerId) {
  return apiCall(`/api/customers/${customerId}`);
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

async function testBalanceUpdate() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Balance Update Test Customer',
      email: `credit.balance${Date.now()}@test.com`
    });
    
    const initialCredit = 20.00;
    await addCustomerCredit(testCustomer._id, initialCredit, 'Test credit');
    
    // Create cart and use some credits
    const cart = await createCart({
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00,
      customer: testCustomer
    });
    
    const creditUsed = 10.00;
    await processCashPaymentWithCredits(cart, creditUsed);
    
    // Wait for balance update
    await sleep(500);
    
    // Check updated balance
    const customerAfterPayment = await getCustomer(testCustomer._id);
    const expectedBalance = initialCredit - creditUsed;
    
    if (Math.abs(customerAfterPayment.credits.balance - expectedBalance) < 0.01) {
      return {
        passed: true,
        details: `Balance: $${expectedBalance}`
      };
    } else {
      return {
        passed: false,
        error: `Expected $${expectedBalance}, got $${customerAfterPayment.credits.balance}`
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

module.exports = testBalanceUpdate;

if (require.main === module) {
  testBalanceUpdate().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}