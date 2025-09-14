#!/usr/bin/env node

/**
 * Unified Test Runner
 * Runs all test files in the tests directory
 * 
 * Usage:
 *   npm run test              # Run all tests (keeps test data)
 *   npm run test <pattern>    # Run tests matching pattern (keeps test data)
 *   npm run test --cleanup    # Clean up test data after running
 */

const fs = require('fs');
const path = require('path');
const { cleanupTestData } = require('./tests/test-utils');

// Test categories and their order
const TEST_CATEGORIES = {
  setup: 'Environment Setup',
  mod: 'Product Modifications',
  discount: 'Discount System',
  cleanup: 'Cleanup'
  // Note: 'seed' tests are excluded from regular test runs
};

/**
 * Discover test files
 */
function discoverTests(pattern = null) {
  const testDir = path.join(__dirname, 'tests');
  const allFiles = fs.readdirSync(testDir)
    .filter(file => file.startsWith('test-') && file.endsWith('.js'))
    .filter(file => file !== 'test-utils.js') // Exclude utility file
    .filter(file => !file.includes('seed')); // Exclude seed scripts from test runs
  
  if (pattern) {
    return allFiles.filter(file => file.includes(pattern))
      .map(file => ({
        name: file.replace('test-', '').replace('.js', '').replace(/-/g, ' '),
        path: path.join(testDir, file),
        category: Object.keys(TEST_CATEGORIES).find(cat => file.includes(`-${cat}-`)) || 'other'
      }));
  }
  
  // Group tests by category
  const grouped = {};
  for (const category of Object.keys(TEST_CATEGORIES)) {
    grouped[category] = allFiles.filter(file => file.includes(`-${category}-`));
  }
  
  // Flatten in order
  const ordered = [];
  for (const category of Object.keys(TEST_CATEGORIES)) {
    ordered.push(...(grouped[category] || []));
  }
  
  // Add any ungrouped tests
  const ungrouped = allFiles.filter(file => !ordered.includes(file));
  ordered.push(...ungrouped);
  
  return ordered.map(file => ({
    name: file.replace('test-', '').replace('.js', '').replace(/-/g, ' '),
    path: path.join(testDir, file),
    category: Object.keys(TEST_CATEGORIES).find(cat => file.includes(`-${cat}-`)) || 'other'
  }));
}

/**
 * Run a single test
 */
async function runTest(test) {
  try {
    // Clear module cache to ensure fresh run
    delete require.cache[require.resolve(test.path)];
    
    const testModule = require(test.path);
    const testFunction = typeof testModule === 'function' 
      ? testModule 
      : testModule.default || testModule.runTest || Object.values(testModule)[0];
    
    if (typeof testFunction !== 'function') {
      return {
        name: test.name,
        passed: false,
        error: 'No test function found'
      };
    }
    
    const result = await testFunction();
    return {
      name: test.name,
      category: test.category,
      ...result
    };
  } catch (error) {
    return {
      name: test.name,
      category: test.category,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests(tests, cleanup = false) {
  console.log('🚀 Test Suite Runner');
  console.log('═'.repeat(60));
  console.log(`Running ${tests.length} tests`);
  console.log('');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {},
    tests: []
  };
  
  let currentCategory = null;
  
  for (const test of tests) {
    // Print category header if changed
    if (test.category !== currentCategory) {
      currentCategory = test.category;
      const categoryName = TEST_CATEGORIES[currentCategory] || currentCategory;
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`📦 ${categoryName}`);
      console.log('─'.repeat(60));
      
      if (!results.byCategory[currentCategory]) {
        results.byCategory[currentCategory] = { total: 0, passed: 0, failed: 0 };
      }
    }
    
    process.stdout.write(`  Running ${test.name}... `);
    
    const result = await runTest(test);
    results.total++;
    results.byCategory[currentCategory].total++;
    
    if (result.passed) {
      results.passed++;
      results.byCategory[currentCategory].passed++;
      console.log('✅ PASSED');
    } else {
      results.failed++;
      results.byCategory[currentCategory].failed++;
      console.log(`❌ FAILED${result.error ? `: ${result.error}` : ''}`);
    }
    
    results.tests.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Display summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  // Category breakdown
  if (Object.keys(results.byCategory).length > 1) {
    console.log('\nBy Category:');
    for (const [category, stats] of Object.entries(results.byCategory)) {
      const categoryName = TEST_CATEGORIES[category] || category;
      console.log(`  ${categoryName}: ${stats.passed}/${stats.total} passed`);
    }
  }
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ❌ ${t.name}`);
        if (t.error) {
          console.log(`     Error: ${t.error}`);
        }
      });
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  // Cleanup if requested
  if (cleanup) {
    console.log('\n🧹 Cleaning up test data...');
    await cleanupTestData();
    console.log('✅ Cleanup complete');
  }
  
  return results;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  const pattern = args.find(arg => !arg.startsWith('--'));
  
  // Check if server is running
  try {
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
    await fetch('http://localhost:3000/api/health');
  } catch (error) {
    console.error('❌ Server is not running. Please start the dev server first.');
    console.log('   Run: npm run dev --turbopack');
    process.exit(1);
  }
  
  // Discover tests
  const tests = discoverTests(pattern);
  
  if (tests.length === 0) {
    console.log('No tests found' + (pattern ? ` matching "${pattern}"` : ''));
    process.exit(0);
  }
  
  // Run tests
  const results = await runAllTests(tests, shouldCleanup);
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, discoverTests };