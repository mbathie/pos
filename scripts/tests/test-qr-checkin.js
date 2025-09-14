/**
 * Test QR Code Check-in
 * Tests the QR check-in endpoint with JSON-formatted QR data
 */

const { getTestConfig, apiCall, createCustomer, formatTestResult, runTest } = require('./test-utils');

async function testQRCheckin() {
  try {
    const config = getTestConfig();
    
    // Create a test customer first
    const customer = await createCustomer({
      name: 'QR Test Customer',
      email: `qrtest${Date.now()}@test.com`,
      phone: '555-1234'
    });
    
    console.log(`Created test customer: ${customer.name} (memberId: ${customer.memberId})`);
    
    // QR code data is now just the plain memberId
    const qrData = String(customer.memberId);
    
    console.log('QR Data (plain memberId):', qrData);
    
    // Test QR check-in with plain text memberId
    const checkinResult = await apiCall('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        customerId: qrData, // Send as plain text memberId
        test: true
      })
    });
    
    // Verify the response
    if (checkinResult.customer && checkinResult.customer._id === customer._id) {
      console.log('✅ Customer correctly identified from QR data');
      console.log(`   Customer: ${checkinResult.customer.name}`);
      console.log(`   Status: ${checkinResult.status}`);
      console.log(`   Message: ${checkinResult.message}`);
      
      return formatTestResult('QR Check-in with plain memberId', true, {
        customerId: customer._id,
        memberId: customer.memberId,
        status: checkinResult.status,
        message: checkinResult.message
      });
    } else {
      return formatTestResult('QR Check-in with plain memberId', false, {
        error: 'Customer not correctly identified',
        expected: customer._id,
        received: checkinResult.customer?._id
      });
    }
    
  } catch (error) {
    return formatTestResult('QR Check-in with plain memberId', false, {
      error: error.message
    });
  }
}

// Run the test
if (require.main === module) {
  runTest('QR Check-in with Plain MemberId', testQRCheckin).then(result => {
    console.log('\n📊 Test Summary:');
    console.log(`   Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    process.exit(result.passed ? 0 : 1);
  });
}

module.exports = testQRCheckin;