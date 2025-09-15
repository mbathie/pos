#!/usr/bin/env node

/**
 * Test transaction correctly stores credit information
 */

const { apiCall, createCustomer, createCart, cleanup } = require('./test-utils');

async function addCustomerCredit(customerId, amount, note = 'Test credit') {
  return apiCall(`/api/customers/${customerId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  });
}

async function getTransaction(transactionId) {
  return apiCall(`/api/transactions/${transactionId}`);
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

async function testTransactionStorage() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Transaction Storage Test Customer',
      email: `credit.trans${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 20.00, 'Test credit');
    
    // Create cart and process payment with credits
    const cart = await createCart({
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00,
      customer: testCustomer
    });
    
    const payment = await processCashPaymentWithCredits(cart, 5.00);
    const transaction = payment.transaction;
    
    // Get full transaction details
    const transactionDetails = await getTransaction(transaction._id);
    
    // Verify credit information is stored
    if (transactionDetails.adjustments?.credits?.amount === 5.00 && 
        transactionDetails.adjustments?.credits?.customerId) {
      return {
        passed: true,
        details: 'Credits stored'
      };
    } else {
      return {
        passed: false,
        error: 'Transaction missing credit information'
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

module.exports = testTransactionStorage;

if (require.main === module) {
  testTransactionStorage().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}