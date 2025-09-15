#!/usr/bin/env node

/**
 * Test debit entries are recorded in customer record
 */

const { apiCall, createCustomer, createCart, cleanup } = require('./test-utils');

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

async function testDebitEntries() {
  let testCustomer = null;
  
  try {
    // Create customer with credits
    testCustomer = await createCustomer({
      name: 'Debit Entry Test Customer',
      email: `credit.debit${Date.now()}@test.com`
    });
    
    await addCustomerCredit(testCustomer._id, 30.00, 'Test credit');
    
    // Make multiple transactions using credits
    for (let i = 0; i < 2; i++) {
      const cart = await createCart({
        subtotal: 5.00,
        tax: 0.50,
        total: 5.50,
        customer: testCustomer
      });
      
      await processCashPaymentWithCredits(cart, 5.00);
    }
    
    // Check debit entries
    const finalCustomer = await getCustomer(testCustomer._id);
    const debits = finalCustomer.credits?.debits || [];
    
    // Should have 2 debit entries with transaction references
    if (debits.length >= 2 && debits.every(d => d.transaction)) {
      return {
        passed: true,
        details: `${debits.length} debits`
      };
    } else {
      return {
        passed: false,
        error: 'Debit entries not properly recorded'
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

module.exports = testDebitEntries;

if (require.main === module) {
  testDebitEntries().then(result => {
    console.log(result.passed ? '✅ Test passed' : '❌ Test failed');
    if (result.error) console.log('Error:', result.error);
    process.exit(result.passed ? 0 : 1);
  });
}