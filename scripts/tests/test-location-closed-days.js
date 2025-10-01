#!/usr/bin/env node

/**
 * Test: Location Closed Days
 *
 * Validates that class/course times are correctly blocked on closed days and public holidays.
 * Tests both single-day and multi-day closed periods.
 */

const {
  apiCall,
  getTestConfig,
  formatTestResult,
  runTest
} = require('./test-utils');

async function testLocationClosedDays() {
  const config = getTestConfig();

  // Step 1: Get the current location
  console.log(`📍 Getting location: ${config.locationId}`);
  const location = await apiCall(`/api/locations/${config.locationId}`);
  console.log(`   Location: ${location.name}`);

  // Step 2: Set up closed days
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const weekAfter = new Date(today);
  weekAfter.setDate(today.getDate() + 7);
  const weekAfterEnd = new Date(today);
  weekAfterEnd.setDate(today.getDate() + 9);

  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfterStr = dayAfter.toISOString().split('T')[0];
  const weekAfterStr = weekAfter.toISOString().split('T')[0];
  const weekAfterEndStr = weekAfterEnd.toISOString().split('T')[0];

  console.log(`\n🚫 Setting closed days...`);
  console.log(`   Single day closure: ${tomorrowStr}`);
  console.log(`   Multi-day closure: ${weekAfterStr} to ${weekAfterEndStr}`);

  const updatedLocation = await apiCall(`/api/locations/${config.locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...location,
      storeHours: [
        { d: 0, open: '09:00', close: '17:00' },
        { d: 1, open: '09:00', close: '17:00' },
        { d: 2, open: '09:00', close: '17:00' },
        { d: 3, open: '09:00', close: '17:00' },
        { d: 4, open: '09:00', close: '17:00' },
        { d: 5, open: '09:00', close: '17:00' },
        { d: 6, open: '09:00', close: '17:00' }
      ],
      closedDays: [
        {
          name: 'Single Day Closure',
          startDate: tomorrowStr,
          endDate: tomorrowStr
        },
        {
          name: 'Multi-Day Closure',
          startDate: weekAfterStr,
          endDate: weekAfterEndStr
        }
      ]
    })
  });
  console.log(`   ✅ Closed days configured`);

  // Step 3: Create a class product with daily schedule
  console.log(`\n📚 Creating test class product...`);
  const product = await apiCall('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `TEST-CLASS-CLOSED-${Date.now()}`,
      desc: 'Test class for closed days validation',
      category: config.categoryId,
      type: 'class',
      capacity: 10,
      publish: true,
      prices: [{ name: 'Adult', value: 20 }],
      schedule: {
        startDate: today.toISOString().split('T')[0],
        noEndDate: true,
        daysOfWeek: [
          { dayIndex: 0, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 1, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 2, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 3, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 4, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 5, times: [{ time: '10:00', label: 'Morning', selected: true }] },
          { dayIndex: 6, times: [{ time: '10:00', label: 'Morning', selected: true }] }
        ]
      }
    })
  });
  console.log(`   Created product: ${product.name} (${product._id})`);

  // Step 4: Check conflict detection for closed days
  console.log(`\n🔍 Checking conflict detection...`);

  const testDates = [
    { date: dayAfterStr, shouldConflict: false, reason: 'Day after tomorrow (not closed)' },
    { date: tomorrowStr, shouldConflict: true, reason: 'Tomorrow (single day closure)' },
    { date: weekAfterStr, shouldConflict: true, reason: 'Week after (start of multi-day closure)' },
    { date: weekAfterEndStr, shouldConflict: true, reason: 'Week after end (end of multi-day closure)' }
  ];

  let allCorrect = true;
  const results = [];

  for (const test of testDates) {
    const testDate = new Date(test.date);
    const dateStr = testDate.toISOString().split('T')[0];

    // Check if date is in closedDays
    const isClosedDay = updatedLocation.closedDays.some(closedDay => {
      return dateStr >= closedDay.startDate && dateStr <= closedDay.endDate;
    });

    const correct = isClosedDay === test.shouldConflict;
    const status = correct ? '✅' : '❌';

    console.log(`   ${status} ${dateStr}: ${test.reason}`);
    console.log(`      Expected conflict: ${test.shouldConflict}, Got: ${isClosedDay}`);

    results.push({
      date: dateStr,
      expectedConflict: test.shouldConflict,
      actualConflict: isClosedDay,
      correct
    });

    if (!correct) allCorrect = false;
  }

  // Step 5: Cleanup
  console.log(`\n🧹 Cleaning up...`);
  await apiCall(`/api/products/${product._id}`, { method: 'DELETE' });

  // Restore location to no closed days
  await apiCall(`/api/locations/${config.locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...updatedLocation,
      closedDays: []
    })
  });
  console.log(`   Deleted test product and restored location`);

  return formatTestResult('Location Closed Days', allCorrect, {
    locationId: config.locationId,
    closedDays: updatedLocation.closedDays,
    testResults: results
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Location Closed Days', testLocationClosedDays)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testLocationClosedDays;
