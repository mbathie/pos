#!/usr/bin/env node

/**
 * Test QR Code Check-in
 * Tests the QR check-in endpoint with JSON-formatted QR data
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

// Test token with correct org
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzZWxlY3RlZExvY2F0aW9uSWQiOiI2OGM0MDQzZDQ1MWVhMzgyZWFhNDNjNDEiLCJlbWFpbCI6Im1iYXRoaWVAZ21haWwuY29tIiwiZW1wbG95ZWVJZCI6IjY4YzQwNDNkNDUxZWEzODJlYWE0M2M0MyIsIm9yZ0lkIjoiNjhjNDA0M2Q0NTFlYTM4MmVhYTQzYzNmIiwiZXhwIjoxODg2MDExMzY2fQ.example';

async function testQRCheckin() {
  console.log('🧪 Testing QR Check-in with JSON data');
  console.log('═'.repeat(60));
  
  // Test data - simulating what QR code contains
  const qrData = {
    type: 'customer',
    memberId: 520371, // Test Customer's memberId
    name: 'Test Customer'
  };
  
  console.log('QR Data:', JSON.stringify(qrData));
  
  try {
    // Test with JSON string (as it would come from QR scanner)
    const response = await fetch(`${API_BASE}/api/checkin/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${TOKEN}`
      },
      body: JSON.stringify({
        customerId: JSON.stringify(qrData), // QR data as JSON string
        test: true
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Check-in successful!');
      console.log('Customer:', result.customer?.name);
      console.log('Status:', result.status);
      console.log('Message:', result.message);
      
      if (result.product) {
        console.log('Product:', result.product.name);
      }
      if (result.membershipCheckin) {
        console.log('Membership:', result.membershipCheckin.product);
      }
    } else {
      console.log('❌ Check-in failed');
      console.log('Error:', result.error || result.message);
      console.log('Status:', result.status);
      console.log('Details:', result.details);
    }
    
    console.log('\nFull response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQRCheckin().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});