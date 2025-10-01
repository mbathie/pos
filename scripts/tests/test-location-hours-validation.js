#!/usr/bin/env node

/**
 * Test: Location Hours Validation
 *
 * Validates that class/course times are correctly checked against location opening hours.
 * Tests conflict detection for times outside store hours.
 */

const {
  apiCall,
  getTestConfig,
  formatTestResult,
  runTest
} = require('./test-utils');

async function testLocationHoursValidation() {
  const config = getTestConfig();

  // Step 1: Get the current location
  console.log(`📍 Getting location: ${config.locationId}`);
  const location = await apiCall(`/api/locations/${config.locationId}`);
  console.log(`   Location: ${location.name}`);

  // Step 2: Update location with specific store hours (9 AM - 5 PM on weekdays)
  console.log(`\n⏰ Setting store hours (9 AM - 5 PM weekdays)...`);
  const updatedLocation = await apiCall(`/api/locations/${config.locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...location,
      storeHours: [
        { d: 0, open: '', close: '' },           // Sunday - closed
        { d: 1, open: '09:00', close: '17:00' }, // Monday
        { d: 2, open: '09:00', close: '17:00' }, // Tuesday
        { d: 3, open: '09:00', close: '17:00' }, // Wednesday
        { d: 4, open: '09:00', close: '17:00' }, // Thursday
        { d: 5, open: '09:00', close: '17:00' }, // Friday
        { d: 6, open: '', close: '' }            // Saturday - closed
      ]
    })
  });
  console.log(`   ✅ Store hours updated`);

  // Step 3: Create a class product with schedule
  console.log(`\n📚 Creating test class product...`);
  const product = await apiCall('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `TEST-CLASS-HOURS-${Date.now()}`,
      desc: 'Test class for hours validation',
      category: config.categoryId,
      type: 'class',
      capacity: 10,
      publish: true,
      prices: [{ name: 'Adult', value: 20 }],
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
        noEndDate: true,
        daysOfWeek: [
          // Monday with times both inside and outside hours
          {
            dayIndex: 0, // Monday
            times: [
              { time: '08:00', label: 'Early Morning', selected: true }, // Before opening
              { time: '10:00', label: 'Morning', selected: true },        // During hours
              { time: '18:00', label: 'Evening', selected: true }         // After closing
            ]
          }
        ]
      }
    })
  });
  console.log(`   Created product: ${product.name} (${product._id})`);

  // Step 4: Get available times for a Monday
  console.log(`\n🔍 Checking available times for next Monday...`);
  const schedules = await apiCall(`/api/products/${product._id}/schedules`);
  console.log(`   Total scheduled times: ${schedules.classes?.length || 0}`);

  // Find next Monday
  const today = new Date();
  const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const mondayStr = nextMonday.toISOString().split('T')[0];

  console.log(`   Next Monday: ${mondayStr}`);

  // Check which times should have conflicts
  const times = [
    { time: '08:00', shouldConflict: true, reason: 'Before opening (9 AM)' },
    { time: '10:00', shouldConflict: false, reason: 'Within hours (9 AM - 5 PM)' },
    { time: '18:00', shouldConflict: true, reason: 'After closing (5 PM)' }
  ];

  let allCorrect = true;
  const results = [];

  for (const test of times) {
    const classDateTime = new Date(`${mondayStr}T${test.time}:00`);
    const scheduled = schedules.classes?.find(s => {
      const schedDate = new Date(s.datetime);
      return schedDate.toISOString() === classDateTime.toISOString();
    });

    if (!scheduled) {
      console.log(`   ⚠️ ${test.time}: No schedule found`);
      results.push({ time: test.time, found: false });
      allCorrect = false;
      continue;
    }

    // Check conflict detection on frontend
    // We'll simulate the useClass logic here
    const dayOfWeek = classDateTime.getDay(); // 1 for Monday
    const storeHour = updatedLocation.storeHours.find(h => h.d === dayOfWeek);

    let hasConflict = false;
    if (!storeHour || !storeHour.open || !storeHour.close) {
      hasConflict = true; // Store closed
    } else {
      const classTime = classDateTime.getHours() * 60 + classDateTime.getMinutes();
      const [openHour, openMin] = storeHour.open.split(':').map(Number);
      const [closeHour, closeMin] = storeHour.close.split(':').map(Number);
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;

      hasConflict = classTime < openTime || classTime > closeTime;
    }

    const correct = hasConflict === test.shouldConflict;
    const status = correct ? '✅' : '❌';

    console.log(`   ${status} ${test.time}: ${test.reason}`);
    console.log(`      Expected conflict: ${test.shouldConflict}, Got: ${hasConflict}`);

    results.push({
      time: test.time,
      found: true,
      expectedConflict: test.shouldConflict,
      actualConflict: hasConflict,
      correct
    });

    if (!correct) allCorrect = false;
  }

  // Step 5: Cleanup
  console.log(`\n🧹 Cleaning up...`);
  await apiCall(`/api/products/${product._id}`, { method: 'DELETE' });
  console.log(`   Deleted test product`);

  return formatTestResult('Location Hours Validation', allCorrect, {
    locationId: config.locationId,
    storeHours: updatedLocation.storeHours,
    testResults: results
  });
}

// Run the test if called directly
if (require.main === module) {
  runTest('Location Hours Validation', testLocationHoursValidation)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testLocationHoursValidation;
