/**
 * Test Utilities for Discount Testing
 * These utilities help simulate real API calls to test discount functionality
 */

const { loadTestData } = require('./test-setup-environment');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

/**
 * Get test configuration from setup
 */
function getTestConfig() {
  const testData = loadTestData();
  
  if (!testData) {
    throw new Error('Test setup not found. Run "npm run test:setup" first.');
  }
  
  return {
    token: testData.token,
    orgId: testData.orgId,
    locationId: testData.locationId,
    employeeId: testData.employeeId,
    testProduct: {
      _id: testData.productId,
      name: testData.productName,
      category: testData.categoryId,
      price: 5.00 // Medium size price
    }
  };
}

/**
 * Make an API call with auth cookie
 */
async function apiCall(path, options = {}) {
  const config = getTestConfig();
  const url = `${API_BASE}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${config.token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Create a test customer via API
 */
async function createCustomer(data) {
  return apiCall('/api/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name || `Test Customer ${Date.now()}`,
      email: data.email || `test${Date.now()}@test.com`,
      phone: data.phone || '555-0000',
      ...data
    })
  });
}

/**
 * Create a test discount via API
 */
async function createDiscount(data) {
  return apiCall('/api/discounts', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name || `TEST-${Date.now()}`,
      description: data.description || 'Test discount',
      mode: 'discount',
      code: data.code || `TEST${Date.now()}`,
      autoAssign: data.autoAssign || false,
      requireCustomer: data.requireCustomer || false,
      adjustments: data.adjustments || [{
        products: [],
        categories: [],
        adjustment: {
          type: 'percent',
          value: data.value || 10,
          maxAmount: data.maxAmount
        }
      }],
      limits: data.limits || {},
      daysOfWeek: data.daysOfWeek || {
        monday: true, tuesday: true, wednesday: true,
        thursday: true, friday: true, saturday: true, sunday: true
      },
      start: data.start,
      expiry: data.expiry,
      musts: data.musts || { products: [], categories: [] }
    })
  });
}

/**
 * Apply adjustments to a cart (simulates discount application)
 */
async function applyAdjustments(cart, options = {}) {
  const config = getTestConfig();
  
  return apiCall('/api/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      cart,
      orgId: config.orgId,
      customer: options.customer || null,
      discountId: options.discountId || null,
      discountCode: options.discountCode || null,
      customDiscountAmount: options.customDiscountAmount || null,
      autoApply: options.autoApply || false,
      isManualSelection: options.isManualSelection || false
    })
  });
}

/**
 * Process a cash payment (completes transaction)
 */
async function processCashPayment(cart, received = 20) {
  const change = Math.max(0, received - cart.total);
  
  return apiCall('/api/payments/cash', {
    method: 'POST',
    body: JSON.stringify({
      cart,
      customer: cart.customer || null,
      received,
      change
    })
  });
}

/**
 * Create a test cart with default product
 */
function createTestCart(options = {}) {
  const config = getTestConfig();
  const product = options.product || config.testProduct;
  const quantity = options.quantity || 1;
  const basePrice = product.price * quantity;
  const tax = basePrice * 0.1; // 10% GST
  
  return {
    products: [{
      _id: product._id,
      name: product.name,
      category: product.category,
      type: 'shop',
      qty: quantity,
      amount: {
        subtotal: basePrice,
        tax: tax,
        total: basePrice + tax
      },
      originalSubtotal: basePrice,
      adjustments: {
        discounts: { items: [], total: 0 },
        surcharges: { items: [], total: 0 }
      }
    }],
    customer: options.customer || null,
    location: { _id: config.locationId },
    subtotal: basePrice,
    tax: tax,
    total: basePrice + tax,
    adjustments: {
      discounts: { items: [], total: 0 },
      surcharges: { items: [], total: 0 }
    }
  };
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    // Get all test customers
    const customers = await apiCall('/api/customers?search=Test%20Customer');
    
    // Delete test customers
    for (const customer of customers) {
      if (customer.name?.startsWith('Test Customer') || customer.email?.includes('test')) {
        await apiCall(`/api/customers/${customer._id}`, { method: 'DELETE' });
      }
    }

    // Get all test discounts
    const discounts = await apiCall('/api/discounts');
    
    // Delete test discounts
    for (const discount of discounts) {
      if (discount.name?.startsWith('TEST-') || discount.code?.startsWith('TEST')) {
        await apiCall(`/api/discounts/${discount._id}`, { method: 'DELETE' });
      }
    }

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️ Cleanup error:', error.message);
  }
}

/**
 * Assert helper for tests
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test result formatter
 */
function formatTestResult(testName, passed, details = {}) {
  return {
    test: testName,
    passed,
    timestamp: new Date().toISOString(),
    details
  };
}

/**
 * Run a test with error handling
 */
async function runTest(testName, testFunction) {
  console.log(`\n🧪 Running: ${testName}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await testFunction();
    
    if (result.passed) {
      console.log(`✅ PASSED: ${testName}`);
    } else {
      console.log(`❌ FAILED: ${testName}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    if (result.details) {
      console.log('\nDetails:', JSON.stringify(result.details, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Test crashed: ${error.message}`);
    console.error(error.stack);
    return formatTestResult(testName, false, { error: error.message });
  }
}

/**
 * Sleep helper for time-based tests
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  API_BASE,
  getTestConfig,
  apiCall,
  createCustomer,
  createDiscount,
  applyAdjustments,
  processCashPayment,
  createTestCart,
  cleanupTestData,
  assert,
  formatTestResult,
  runTest,
  sleep
};