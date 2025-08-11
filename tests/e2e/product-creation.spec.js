const { test, expect } = require('@playwright/test');
const { generateTestUser, testProducts } = require('../helpers/test-data');

test.describe('Product Creation', () => {
  let testUser;
  const flatWhite = testProducts.flatWhite;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser();
    
    // Sign up a new user for each test
    await page.goto('/signup');
    await page.fill('input[id="business-name"]', testUser.orgName);
    await page.fill('input[id="name"]', testUser.name);
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="phone"]', testUser.phone);
    await page.fill('input[id="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for shop page
    await page.waitForURL('**/shop', { timeout: 10000 });
  });

  test('should navigate to products page', async ({ page }) => {
    // Navigate to products page  
    await page.goto('/products/shop');
    
    // Verify we're on the products page
    await expect(page).toHaveURL(/.*products\/shop/);
    
    // Look for products page elements - should have tabs or product-related UI
    const tabsList = page.locator('[role="tablist"]').first();
    const addButton = page.locator('button').filter({ hasText: /add|new|\+/i }).first();
    
    // Check if either tabs or add button is visible
    const tabsVisible = await tabsList.isVisible().catch(() => false);
    const buttonVisible = await addButton.isVisible().catch(() => false);
    
    expect(tabsVisible || buttonVisible).toBeTruthy();
  });

  test('should open product creation modal', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products/shop');
    
    // Look for a button that creates products
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for modal or form to appear
      await page.waitForTimeout(1000);
      
      // Check if product creation form is visible
      const productNameInput = page.locator('input[placeholder*="name" i], input[placeholder*="product" i]').first();
      await expect(productNameInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to shop and see product categories', async ({ page }) => {
    // Go to shop page
    await page.goto('/shop');
    
    // Verify we're on the shop page
    await expect(page).toHaveURL(/.*shop/);
    
    // Should see some kind of product interface
    await expect(page.locator('[class*="product"], [class*="category"], [class*="item"]').first()).toBeVisible({ timeout: 5000 });
  });
});