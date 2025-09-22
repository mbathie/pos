#!/usr/bin/env node

/**
 * Test: Suspended Membership Discount Blocking
 *
 * This test verifies that membership-related discounts are properly blocked
 * when a customer's membership is suspended.
 *
 * Test Scenarios:
 * 1. Active membership - discount should apply
 * 2. Suspended membership - discount should be blocked
 * 3. Resume membership - discount should apply again
 */

const { apiCall } = require('./test-utils');

async function runTest() {
  console.log('='.repeat(60));
  console.log('TEST: Suspended Membership Discount Blocking');
  console.log('='.repeat(60));

  try {
    // Note: This test uses the existing test database setup
    // Assumes test data is already seeded with:
    // - Test customer with active membership
    // - Member discount that requires membership
    // - Shop products for testing

    console.log('📝 Using test environment data...');
    console.log('  Customer: suspended.test@example.com');
    console.log('  Discount Code: MEMBERTEST (20% off for members)');
    console.log();

    // Get customer with membership
    const searchResult = await apiCall('/api/customers?search=suspended.test@example.com');
    if (!searchResult.customers || searchResult.customers.length === 0) {
      throw new Error('Test customer not found. Please run seed script first.');
    }
    const customer = searchResult.customers[0];

    // Get customer's memberships
    const membershipResult = await apiCall(`/api/customers/${customer._id}/memberships`);
    if (!membershipResult.memberships || membershipResult.memberships.length === 0) {
      throw new Error('No membership found for test customer');
    }
    const membership = membershipResult.memberships[0];

    // Create test cart
    const cart = {
      products: [{
        _id: '123456789',
        name: 'Test Coffee',
        type: 'shop',
        amount: {
          subtotal: 5,
          tax: 0.5,
          total: 5.5
        }
      }],
      subtotal: 5,
      tax: 0.5,
      total: 5.5,
      customer: customer
    };

    // Test 1: Active membership - discount should apply
    console.log('TEST 1: Active Membership');
    console.log('-'.repeat(40));

    // Calculate adjustments through API
    const result1 = await apiCall('/api/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        cart: cart,
        customer: customer,
        discountCode: 'MEMBERTEST'
      })
    });

    if (result1.adjustments && result1.adjustments.discounts && result1.adjustments.discounts.total > 0) {
      console.log(`✅ Discount applied: -$${result1.adjustments.discounts.total.toFixed(2)}`);
      console.log(`   Original: $${cart.total.toFixed(2)}`);
      console.log(`   After discount: $${result1.total.toFixed(2)}`);
    } else {
      console.log(`❌ Discount not applied`);
      if (result1.adjustments && result1.adjustments.discountError) {
        console.log(`   Error: ${result1.adjustments.discountError}`);
      }
    }
    console.log();

    // Test 2: Suspend membership - discount should be blocked
    console.log('TEST 2: Suspended Membership');
    console.log('-'.repeat(40));

    // Suspend the membership
    console.log('  Suspending membership for 7 days...');
    try {
      await apiCall(`/api/memberships/${membership._id}/pause`, {
        method: 'POST',
        body: JSON.stringify({
          suspensionDays: 7,
          note: 'Test suspension'
        })
      });
      console.log(`  Membership suspended successfully\n`);
    } catch (error) {
      console.log(`  Note: Suspension failed (may be test environment): ${error.message}\n`);
    }

    // Wait a moment for the suspension to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Re-fetch customer to get updated membership status
    const updatedCustomer = await apiCall(`/api/customers/${customer._id}`);

    const result2 = await apiCall('/api/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        cart: cart,
        customer: updatedCustomer,
        discountCode: 'MEMBERTEST'
      })
    });

    if (result2.adjustments && result2.adjustments.discounts && result2.adjustments.discounts.total > 0) {
      console.log(`❌ ERROR: Discount was applied to suspended member!`);
      console.log(`   Discount amount: -$${result2.adjustments.discounts.total.toFixed(2)}`);
    } else {
      console.log(`✅ Discount correctly blocked for suspended member`);
      if (result2.adjustments && result2.adjustments.discountError) {
        console.log(`   Reason: ${result2.adjustments.discountError}`);
      }
    }
    console.log();

    // Test 3: Resume membership - discount should apply again
    console.log('TEST 3: Resumed Membership');
    console.log('-'.repeat(40));

    // Resume the membership
    console.log('  Resuming membership...');
    try {
      await apiCall(`/api/memberships/${membership._id}/resume`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      console.log(`  Membership resumed successfully\n`);
    } catch (error) {
      console.log(`  Note: Resume failed (may be test environment): ${error.message}\n`);
    }

    // Wait a moment for the resume to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Re-fetch customer again to get updated status
    const resumedCustomer = await apiCall(`/api/customers/${customer._id}`);

    const result3 = await apiCall('/api/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        cart: cart,
        customer: resumedCustomer,
        discountCode: 'MEMBERTEST'
      })
    });

    if (result3.adjustments && result3.adjustments.discounts && result3.adjustments.discounts.total > 0) {
      console.log(`✅ Discount re-applied after resume: -$${result3.adjustments.discounts.total.toFixed(2)}`);
      console.log(`   Original: $${cart.total.toFixed(2)}`);
      console.log(`   After discount: $${result3.total.toFixed(2)}`);
    } else {
      console.log(`❌ ERROR: Discount not applied after resume`);
      if (result3.adjustments && result3.adjustments.discountError) {
        console.log(`   Error: ${result3.adjustments.discountError}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const test1Pass = result1.adjustments && result1.adjustments.discounts && result1.adjustments.discounts.total > 0;
    const test2Pass = !result2.adjustments || !result2.adjustments.discounts || result2.adjustments.discounts.total === 0;
    const test3Pass = result3.adjustments && result3.adjustments.discounts && result3.adjustments.discounts.total > 0;

    console.log(`Test 1 (Active membership): ${test1Pass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 2 (Suspended membership): ${test2Pass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 3 (Resumed membership): ${test3Pass ? '✅ PASSED' : '❌ FAILED'}`);

    const allPassed = test1Pass && test2Pass && test3Pass;
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message || error);
    process.exit(1);
  }
}

// Run the test
runTest();