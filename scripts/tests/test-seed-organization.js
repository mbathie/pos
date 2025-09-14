/**
 * Seed Organization
 * Creates the initial organization and employee account
 */

const seedData = require('./seed-data.json');
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

/**
 * Create organization with Mark's Gyms
 */
async function seedOrganization() {
  console.log(`  Creating ${seedData.organization.name} organization...`);
  
  const signupData = {
    email: seedData.organization.email,
    password: seedData.organization.password,
    name: seedData.organization.name,
    nameEmployee: seedData.organization.employeeName,
    phone: seedData.organization.phone
  };
  
  // Sign up (creates org and employee)
  const signupResponse = await fetch(`${API_BASE}/api/auth/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signupData)
  });

  if (!signupResponse.ok) {
    const error = await signupResponse.text();
    
    // If org already exists, try to login instead
    if (error.includes('already exists')) {
      console.log('  Organization already exists, attempting login...');
      
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password
        })
      });
      
      if (!loginResponse.ok) {
        throw new Error('Login failed after signup conflict');
      }
      
      const loginData = await loginResponse.json();
      let token = loginData.token;
      
      if (!token) {
        const loginCookies = loginResponse.headers.get('set-cookie');
        if (loginCookies) {
          const tokenMatch = loginCookies.match(/token=([^;]+)/);
          if (tokenMatch) {
            token = tokenMatch[1];
          }
        }
      }
      
      if (!token) {
        throw new Error('Could not obtain authentication token from login');
      }
      
      // Decode token to get IDs
      const tokenParts = token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      return {
        token,
        email: signupData.email,
        password: signupData.password,
        orgId: payload.orgId,
        employeeId: payload.employeeId,
        locationId: payload.selectedLocationId,
        orgName: signupData.name,
        employeeName: signupData.nameEmployee
      };
    }
    
    throw new Error(`Signup failed: ${error}`);
  }

  // Extract token from response
  const cookies = signupResponse.headers.get('set-cookie');
  let token = null;
  
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  }
  
  const signupResponseData = await signupResponse.json();
  if (!token && signupResponseData.token) {
    token = signupResponseData.token;
  }
  
  if (!token) {
    // Try logging in if no token from signup
    console.log('  No token from signup, attempting login...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: signupData.email,
        password: signupData.password
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed after signup');
    }
    
    const loginData = await loginResponse.json();
    token = loginData.token;
    
    if (!token) {
      const loginCookies = loginResponse.headers.get('set-cookie');
      if (loginCookies) {
        const tokenMatch = loginCookies.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }
    }
  }
  
  if (!token) {
    throw new Error('Could not obtain authentication token');
  }
  
  // Decode the JWT token to get orgId, employeeId, locationId
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
  
  // Set PIN to "1234" for easy access
  console.log('  Setting PIN to 1234...');
  const pinResponse = await fetch(`${API_BASE}/api/auth/pin/set`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      pin: '1234'
    })
  });
  
  if (!pinResponse.ok) {
    console.log('  Warning: Could not set PIN, but continuing...');
  } else {
    console.log('  ✅ PIN set to 1234');
  }
  
  const result = {
    token,
    email: signupData.email,
    password: signupData.password,
    pin: '1234',
    orgId: payload.orgId,
    employeeId: payload.employeeId,
    locationId: payload.selectedLocationId,
    orgName: signupData.name,
    employeeName: signupData.nameEmployee
  };
  
  // Save the result to .seed-data.json for other seed tests to use
  const fs = require('fs');
  const path = require('path');
  const seedDataFile = path.join(__dirname, '.seed-data.json');
  fs.writeFileSync(seedDataFile, JSON.stringify(result, null, 2));
  
  return result;
}

// Export as default test function for the test runner
async function testSeedOrganization() {
  try {
    const result = await seedOrganization();
    return {
      passed: true,
      details: {
        orgName: result.orgName,
        email: result.email,
        employeeId: result.employeeId
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

module.exports = testSeedOrganization;
module.exports.seedOrganization = seedOrganization;