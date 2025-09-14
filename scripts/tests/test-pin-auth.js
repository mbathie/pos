/**
 * Test PIN Authentication
 * Verifies that PIN was set correctly after signup
 */

const fs = require('fs');
const path = require('path');
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

/**
 * Test PIN verification after setting
 */
async function testPinAuth() {
  console.log('  Testing PIN verification...');
  
  // First, we need to login as mbathie@gmail.com to get the proper token
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'mbathie@gmail.com',
      password: 'test'
    })
  });
  
  if (!loginResponse.ok) {
    throw new Error('Failed to login as mbathie@gmail.com');
  }
  
  // Extract token from login response
  let token = null;
  const cookies = loginResponse.headers.get('set-cookie');
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  }
  
  if (!token) {
    const loginData = await loginResponse.json();
    token = loginData.token;
  }
  
  if (!token) {
    throw new Error('Could not get token from login');
  }
  
  // Verify the PIN using the authenticated token
  const pinAuthResponse = await fetch(`${API_BASE}/api/auth/pin/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      pin: '1234'
    })
  });
  
  if (!pinAuthResponse.ok) {
    const error = await pinAuthResponse.text();
    throw new Error(`PIN authentication failed: ${error}`);
  }
  
  const authData = await pinAuthResponse.json();
  
  // Check if PIN verification was successful
  if (!authData.success) {
    throw new Error('PIN verification failed');
  }
  
  console.log('  ✅ PIN verified successfully');
  
  // Also test PIN status endpoint to confirm PIN is set
  const pinStatusResponse = await fetch(`${API_BASE}/api/auth/pin/status`, {
    method: 'GET',
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (!pinStatusResponse.ok) {
    throw new Error('Could not check PIN status');
  }
  
  const statusData = await pinStatusResponse.json();
  
  if (!statusData.hasPinSet) {
    throw new Error('PIN was not set properly');
  }
  
  console.log(`  ✅ PIN status confirmed: PIN is set`);
  
  return {
    passed: true,
    details: {
      email: 'mbathie@gmail.com',
      pin: '1234',
      pinVerified: true,
      pinStatus: statusData.hasPinSet
    }
  };
}

// Export as default test function for the test runner
module.exports = testPinAuth;