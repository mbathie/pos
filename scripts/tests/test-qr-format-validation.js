/**
 * Test QR Code Format Validation
 * Ensures only JSON-formatted QR codes are accepted
 */

const { getTestConfig, apiCall, formatTestResult, runTest } = require('./test-utils');

async function testInvalidQRFormats() {
  const config = getTestConfig();
  const results = [];
  
  // Test 1: Direct ObjectId string (old format) should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: '68c4fd6e15418038fb706ce6', // Direct ID, not JSON
        test: true
      })
    });
    results.push({ test: 'Direct ObjectId', passed: false, reason: 'Should have rejected non-JSON format' });
  } catch (error) {
    if (error.message.includes('Invalid QR code format')) {
      results.push({ test: 'Direct ObjectId', passed: true });
    } else {
      results.push({ test: 'Direct ObjectId', passed: false, reason: error.message });
    }
  }
  
  // Test 2: Invalid JSON should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'not-json-at-all',
        test: true
      })
    });
    results.push({ test: 'Invalid string', passed: false, reason: 'Should have rejected invalid format' });
  } catch (error) {
    if (error.message.includes('Invalid QR code format')) {
      results.push({ test: 'Invalid string', passed: true });
    } else {
      results.push({ test: 'Invalid string', passed: false, reason: error.message });
    }
  }
  
  // Test 3: JSON without memberId should be rejected
  try {
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: JSON.stringify({ type: 'customer', name: 'Test' }), // Missing memberId
        test: true
      })
    });
    results.push({ test: 'Missing memberId', passed: false, reason: 'Should have rejected JSON without memberId' });
  } catch (error) {
    if (error.message.includes('Missing memberId')) {
      results.push({ test: 'Missing memberId', passed: true });
    } else {
      results.push({ test: 'Missing memberId', passed: false, reason: error.message });
    }
  }
  
  // Test 4: Valid JSON format should work
  try {
    const validData = {
      type: 'customer',
      memberId: 999999, // Non-existent but valid format
      name: 'Test Customer'
    };
    
    await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: JSON.stringify(validData),
        test: true
      })
    });
    // Should fail with "Customer not found" not format error
    results.push({ test: 'Valid JSON format', passed: false, reason: 'Should get customer not found, not format error' });
  } catch (error) {
    if (error.message.includes('Customer not found')) {
      results.push({ test: 'Valid JSON format', passed: true });
    } else {
      results.push({ test: 'Valid JSON format', passed: false, reason: error.message });
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