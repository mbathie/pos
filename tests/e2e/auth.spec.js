const { test, expect } = require('@playwright/test');
const { generateTestUser } = require('../helpers/test-data');

test.describe('Authentication', () => {
  let testUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should successfully sign up a new user', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Create your business account');

    // Fill in the signup form
    await page.fill('input[id="business-name"]', testUser.orgName);
    await page.fill('input[id="name"]', testUser.name);
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="phone"]', testUser.phone);
    await page.fill('input[id="password"]', testUser.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to shop page
    await page.waitForURL('**/shop', { timeout: 10000 });

    // Verify we're on the shop page
    await expect(page).toHaveURL(/.*shop/);

    // Verify user is logged in by checking for sidebar
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Try to submit without filling any fields
    await page.click('button[type="submit"]');

    // Check that browser's built-in validation prevents submission
    // The form should not submit and we should still be on signup page
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should navigate to login page from signup', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Click on the login link
    await page.click('text=Sign in');

    // Should navigate to login page
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);
    
    // Verify login page loads
    await expect(page.locator('h1')).toContainText('Login to your account');
  });
});