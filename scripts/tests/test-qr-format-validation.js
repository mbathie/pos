/**
 * Test QR Code Format Validation
 * Ensures only plain numeric member IDs are accepted
 */

const { getTestConfig, apiCall, formatTestResult, runTest } = require('./test-utils');

async function testInvalidQRFormats() {
  const config = getTestConfig();
  const results = [];
  
  // Test 1: Non-numeric string should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'not-a-number',
        test: true
      })
    });
    results.push({ test: 'Non-numeric string', passed: false, reason: 'Should have rejected non-numeric format' });
  } catch (error) {
    if (error.message.includes('Invalid QR code format') || error.message.includes('numeric member ID')) {
      results.push({ test: 'Non-numeric string', passed: true });
    } else {
      results.push({ test: 'Non-numeric string', passed: false, reason: error.message });
    }
  }
  
  // Test 2: ObjectId string should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: '68c4fd6e15418038fb706ce6', // ObjectId format
        test: true
      })
    });
    results.push({ test: 'ObjectId string', passed: false, reason: 'Should have rejected ObjectId format' });
  } catch (error) {
    if (error.message.includes('Invalid QR code format') || error.message.includes('numeric member ID')) {
      results.push({ test: 'ObjectId string', passed: true });
    } else {
      results.push({ test: 'ObjectId string', passed: false, reason: error.message });
    }
  }
  
  // Test 3: JSON object should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: JSON.stringify({ type: 'customer', memberId: 123456 }), // JSON format
        test: true
      })
    });
    results.push({ test: 'JSON object', passed: false, reason: 'Should have rejected JSON format' });
  } catch (error) {
    if (error.message.includes('Invalid QR code format') || error.message.includes('numeric member ID')) {
      results.push({ test: 'JSON object', passed: true });
    } else {
      results.push({ test: 'JSON object', passed: false, reason: error.message });
    }
  }
  
  // Test 4: Valid numeric string should work
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: '999999', // Non-existent but valid format
        test: true
      })
    });
    // Should fail with "Customer not found" not format error
    results.push({ test: 'Valid numeric string', passed: false, reason: 'Should get customer not found, not format error' });
  } catch (error) {
    if (error.message.includes('Customer not found')) {
      results.push({ test: 'Valid numeric string', passed: true });
    } else {
      results.push({ test: 'Valid numeric string', passed: false, reason: error.message });
    }
  }
  
  // Check if all tests passed
  const allPassed = results.every(r => r.passed);
  
  console.log('\nValidation Test Results:');
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.test}${r.reason ? ': ' + r.reason : ''}`);
  });
  
  return formatTestResult('QR Format Validation', allPassed, { results });
}

// Run the test
if (require.main === module) {
  runTest('QR Code Format Validation', testInvalidQRFormats).then(result => {
    console.log('\n📊 Test Summary:');
    console.log(`   Result: ${result.passed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    process.exit(result.passed ? 0 : 1);
  });
}

module.exports = testInvalidQRFormats;