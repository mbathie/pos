const { test: base } = require('@playwright/test');
const { generateTestUser } = require('../helpers/test-data');

/**
 * Custom fixture that provides authenticated page context
 */
exports.test = base.extend({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // This will be populated after signup/login
    await use(page);
  },

  // Test user data fixture
  testUser: async ({}, use) => {
    const user = generateTestUser();
    await use(user);
  },
});