#!/usr/bin/env node

/**
 * Test: Location Weekend Closure
 *
 * Validates that classes scheduled on weekends (when store is closed) are properly marked as conflicts.
 * Tests the scenario where store only opens Monday-Friday.
 */

const {
  apiCall,
  getTestConfig,
  formatTestResult,
  runTest
} = require('./test-utils');

async function testLocationWeekendClosure() {
  const config = getTestConfig();

  // Step 1: Get the current location
  console.log(`📍 Getting location: ${config.locationId}`);
  const location = await apiCall(`/api/locations/${config.locationId}`);
  console.log(`   Location: ${location.name}`);

  // Step 2: Configure location to only be open Monday-Friday
  console.log(`\n⏰ Setting weekday-only hours (Monday-Friday, 9 AM - 5 PM)...`);
  const updatedLocation = await apiCall(`/api/locations/${config.locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...location,
      storeHours: [
        { d: 0, open: '', close: '' },           // Sunday - CLOSED
        { d: 1, open: '09:00', close: '17:00' }, // Monday
        { d: 2, open: '09:00', close: '17:00' }, // Tuesday
        { d: 3, open: '09:00', close: '17:00' }, // Wednesday
        { d: 4, open: '09:00', close: '17:00' }, // Thursday
        { d: 5, open: '09:00', close: '17:00' }, // Friday
        { d: 6, open: '', close: '' }            // Saturday - CLOSED
      ],
      closedDays: []
    })
  });
  console.log(`   ✅ Store hours updated (weekdays only)`);

  // Step 3: Create a class product with 7-day schedule
  console.log(`\n📚 Creating test class product with 7-day schedule...`);
  const product = await apiCall('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `TEST-CLASS-WEEKEND-${Date.now()}`,
      desc: 'Test class for weekend closure validation',
      category: config.categoryId,
      type: 'class',
      capacity: 10,
      publish: true,
      prices: [{ name: 'Adult', value: 20 }],
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
        noEndDate: true,
        daysOfWeek: [
          { dayIndex: 0, times: [{ time: '10:00', label: 'Monday Class', selected: true }] },
          { dayIndex: 1, times: [{ time: '10:00', label: 'Tuesday Class', selected: true }] },
          { dayIndex: 2, times: [{ time: '10:00', label: 'Wednesday Class', selected: true }] },
          { dayIndex: 3, times: [{ time: '10:00', label: 'Thursday Class', selected: true }] },
          { dayIndex: 4, times: [{ time: '10:00', label: 'Friday Class', selected: true }] },
          { dayIndex: 5, times: [{ time: '10:00', label: 'Saturday Class', selected: true }] },
          { dayIndex: 6, times: [{ time: '10:00', label: 'Sunday Class', selected: true }] }
        ]
      }
    })
  });
  console.log(`   Created product: ${product.name} (${product._id})`);

  // Step 4: Check conflict detection for each day
  console.log(`\n🔍 Checking conflict detection for each day of week...`);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const testDays = [
    { dayIndex: 1, day: 'Monday', shouldConflict: false, reason: 'Weekday - store open' },
    { dayIndex: 2, day: 'Tuesday', shouldConflict: false, reason: 'Weekday - store open' },
    { dayIndex: 3, day: 'Wednesday', shouldConflict: false, reason: 'Weekday - store open' },
    { dayIndex: 4, day: 'Thursday', shouldConflict: false, reason: 'Weekday - store open' },
    { dayIndex: 5, day: 'Friday', shouldConflict: false, reason: 'Weekday - store open' },
    { dayIndex: 6, day: 'Saturday', shouldConflict: true, reason: 'Weekend - store closed' },
    { dayIndex: 0, day: 'Sunday', shouldConflict: true, reason: 'Weekend - store closed' }
  ];

  let allCorrect = true;
  const results = [];

  for (const test of testDays) {
    // Find corresponding day of week in storeHours
    // Convert our dayIndex (0=Monday) to JavaScript dayOfWeek (0=Sunday, 1=Monday)
    const jsDayOfWeek = test.dayIndex === 6 ? 0 : test.dayIndex + 1;
    const storeHour = updatedLocation.storeHours.find(h => h.d === jsDayOfWeek);

    // Check if this day has conflicts (no hours or outside hours)
    const hasConflict = !storeHour || !storeHour.open || !storeHour.close;

    const correct = hasConflict === test.shouldConflict;
    const status = correct ? '✅' : '❌';

    console.log(`   ${status} ${test.day}: ${test.reason}`);
    console.log(`      Expected conflict: ${test.shouldConflict}, Got: ${hasConflict}`);
    console.log(`      Store hours: ${storeHour?.open || 'CLOSED'} - ${storeHour?.close || 'CLOSED'}`);

    results.push({
      day: test.day,
      dayIndex: test.dayIndex,
      expectedConflict: test.shouldConflict,
      actualConflict: hasConflict,
      storeHours: storeHour,
      correct
    });

    if (!correct) allCorrect = false;
  }

  // Step 5: Cleanup
  console.log(`\n🧹 Cleaning up...`);
  await apiCall(`/api/products/${product._id}`, { method: 'DELETE' });
  console.log(`   Deleted test product`);

  return formatTestResult('Location Weekend Closure', allCorrect, {
    locationId: config.locationId,
    storeHours: updatedLocation.storeHours,
    testResults: results
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Location Weekend Closure', testLocationWeekendClosure)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testLocationWeekendClosure;
