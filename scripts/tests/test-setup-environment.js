/**
 * Test Setup - Creates test organization, employee, and products
 * This must be run first to establish authentication and test data
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';
const TEST_DATA_FILE = path.join(__dirname, '.test-data.json');

/**
 * Load saved test data
 */
function loadTestData() {
  try {
    if (fs.existsSync(TEST_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
      console.log('📂 Loaded existing test data');
      return data;
    }
  } catch (error) {
    console.log('⚠️ Could not load test data:', error.message);
  }
  return null;
}

/**
 * Save test data for other tests to use
 */
function saveTestData(data) {
  fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(data, null, 2));
  console.log('💾 Saved test data to', TEST_DATA_FILE);
}

/**
 * Check if test setup is still valid
 */
async function isSetupValid(testData) {
  if (!testData || !testData.token) return false;
  
  try {
    // Try to fetch products with the token to see if it's still valid
    const response = await fetch(`${API_BASE}/api/products`, {
      headers: {
        'Cookie': `token=${testData.token}`
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Create test organization and employee via signup
 */
async function createTestOrganization() {
  console.log('\n🏢 Creating test organization...');
  
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@test.com`;
  const testOrgName = `Test Org ${timestamp}`;
  
  // Step 1: Sign up (creates org and employee)
  const signupResponse = await fetch(`${API_BASE}/api/auth/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail,
      password: 'TestPassword123!',
      name: testOrgName,
      nameEmployee: 'Test Employee',
      phone: '555-TEST-001'
    })
  });

  if (!signupResponse.ok) {
    const error = await signupResponse.text();
    throw new Error(`Signup failed: ${error}`);
  }

  const signupData = await signupResponse.json();
  
  // Extract the token from the response headers or body
  const cookies = signupResponse.headers.get('set-cookie');
  let token = null;
  
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  }
  
  // If no token in cookies, it might be in the response body
  if (!token && signupData.token) {
    token = signupData.token;
  }
  
  // If still no token, try logging in
  if (!token) {
    console.log('🔑 No token from signup, attempting login...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed after signup');
    }
    
    const loginData = await loginResponse.json();
    token = loginData.token;
    
    if (!token) {
      // Check cookies again
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
  // JWT tokens are base64 encoded with 3 parts separated by dots
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  // Decode the payload (second part)
  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
  
  console.log('✅ Organization created:', testOrgName);
  console.log('✅ Employee created:', testEmail);
  console.log('✅ Token obtained');
  
  return {
    token,
    email: testEmail,
    orgId: payload.orgId,
    employeeId: payload.employeeId,
    locationId: payload.selectedLocationId,
    orgName: testOrgName
  };
}

/**
 * Create test products
 */
async function createTestProducts(token) {
  console.log('\n☕ Creating test products...');
  
  // Create a coffee category first
  const categoryName = 'TestCoffee';
  const categoryResponse = await fetch(`${API_BASE}/api/categories/${categoryName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name: 'Test Coffee',
      icon: '☕',
      color: '#8B4513'
    })
  });
  
  if (!categoryResponse.ok) {
    const error = await categoryResponse.text();
    console.log('Category creation failed:');
    console.log('  Status:', categoryResponse.status);
    console.log('  Response:', error);
    throw new Error(`Failed to create category: Status ${categoryResponse.status}`);
  }
  
  const categoryData = await categoryResponse.json();
  const category = categoryData.category;
  console.log('✅ Created category:', category.name || 'Test Coffee');
  
  // Create Flat White product
  const productResponse = await fetch(`${API_BASE}/api/categories/${category._id}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      product: {
        name: 'Test Flat White',
        category: category._id,
        type: 'shop',
        variations: [
          { name: 'Small', value: '', amount: 4.50 },
          { name: 'Medium', value: '', amount: 5.00 },
          { name: 'Large', value: '', amount: 5.50 }
        ],
        locations: []
      }
    })
  });
  
  if (!productResponse.ok) {
    const error = await productResponse.text();
    console.log('Product creation failed:');
    console.log('  Status:', productResponse.status);
    console.log('  Response:', error);
    throw new Error(`Failed to create product: Status ${productResponse.status}`);
  }
  
  const productData = await productResponse.json();
  const product = productData.product || productData;
  console.log('✅ Created product:', product.name || 'Test Flat White');
  
  return {
    categoryId: category._id,
    productId: product._id,
    productName: product.name,
    categoryName: category.name
  };
}

/**
 * Main setup function
 */
async function setup(forceNew = false) {
  console.log('🚀 Test Environment Setup');
  console.log('═'.repeat(60));
  
  // Check if we have existing valid test data
  if (!forceNew) {
    const existingData = loadTestData();
    if (existingData && await isSetupValid(existingData)) {
      console.log('✅ Using existing test setup');
      console.log(`   Org: ${existingData.orgName}`);
      console.log(`   Email: ${existingData.email}`);
      return existingData;
    }
  }
  
  try {
    // Create new test organization
    const orgData = await createTestOrganization();
    
    // Create test products
    const productData = await createTestProducts(orgData.token);
    
    // Combine all test data
    const testData = {
      ...orgData,
      ...productData,
      createdAt: new Date().toISOString()
    };
    
    // Save for other tests to use
    saveTestData(testData);
    
    console.log('\n✅ Test setup complete!');
    console.log('═'.repeat(60));
    
    return testData;
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test environment...');
  
  const testData = loadTestData();
  if (!testData || !testData.token) {
    console.log('No test data to clean up');
    return;
  }
  
  try {
    // Note: We can't easily delete the org/employee via API
    // but we can delete test products and categories
    
    // Delete test product
    if (testData.productId) {
      await fetch(`${API_BASE}/api/products/${testData.productId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `token=${testData.token}`
        }
      });
      console.log('✅ Deleted test product');
    }
    
    // Delete test category
    if (testData.categoryId) {
      await fetch(`${API_BASE}/api/categories/${testData.categoryId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `token=${testData.token}`
        }
      });
      console.log('✅ Deleted test category');
    }
    
    // Remove test data file
    if (fs.existsSync(TEST_DATA_FILE)) {
      fs.unlinkSync(TEST_DATA_FILE);
      console.log('✅ Removed test data file');
    }
    
  } catch (error) {
    console.error('⚠️ Cleanup error:', error.message);
  }
}

// Export as default test function for the test runner
async function testSetupEnvironment() {
  try {
    const result = await setup();
    return {
      passed: true,
      details: {
        orgName: result.orgName,
        email: result.email
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Export for use in other tests
module.exports = testSetupEnvironment;
module.exports.setup = setup;
module.exports.cleanup = cleanup;
module.exports.loadTestData = loadTestData;
module.exports.API_BASE = API_BASE;

// Run setup if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'cleanup') {
    cleanup().then(() => {
      console.log('✅ Cleanup complete');
      process.exit(0);
    }).catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
  } else {
    const forceNew = args[0] === '--force';
    setup(forceNew).then(() => {
      console.log('\n📝 Test data saved. Other tests can now run.');
      process.exit(0);
    }).catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
  }
}