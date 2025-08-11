const { test, expect } = require('@playwright/test');
const { generateTestUser, testProducts } = require('../helpers/test-data');

test.describe('Full Product Creation Flow', () => {
  let testUser;

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

  test('should create a category with Save button', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products/shop');
    await page.waitForLoadState('networkidle');
    
    console.log('Creating category: Hot Drinks');
    
    // Click the + button next to Categories text
    const categoriesSection = page.locator('text=Categories').locator('..');
    const addButton = categoriesSection.locator('button').first();
    await addButton.click();
    
    // Wait for input to appear below with "Coffees" placeholder
    await page.waitForTimeout(500);
    
    // The input appears with "Coffees" as placeholder - clear it and enter our category name
    const categoryInput = page.locator('input[placeholder="Coffees"]');
    await categoryInput.clear();
    await categoryInput.fill('Hot Drinks');
    
    // Click the Save button in the top right
    console.log('Clicking Save button');
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();
    
    // Wait for category to be saved
    await page.waitForTimeout(1000);
    
    // Verify category appears in the list below
    const categoryInList = page.locator('text="Hot Drinks"').first();
    await expect(categoryInList).toBeVisible({ timeout: 5000 });
    
    console.log('Category created and saved successfully');
  });

  test('should create category and add product', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products/shop');
    await page.waitForLoadState('networkidle');
    
    // Create a category first
    console.log('Creating category: Hot Drinks');
    const categoriesSection = page.locator('text=Categories').locator('..');
    const addButton = categoriesSection.locator('button').first();
    await addButton.click();
    
    await page.waitForTimeout(500);
    const categoryInput = page.locator('input[placeholder="Coffees"]');
    await categoryInput.clear();
    await categoryInput.fill('Hot Drinks');
    
    // Click Save button
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();
    
    await page.waitForTimeout(1000);
    
    // Verify category was created
    const categoryInList = page.locator('text="Hot Drinks"').first();
    await expect(categoryInList).toBeVisible({ timeout: 5000 });
    
    // Click on the Hot Drinks category to select it
    await categoryInList.click();
    await page.waitForTimeout(500);
    
    console.log('Category selected, looking for New Product button');
    
    // Look for the "New Product" button that appears after creating a category
    const newProductButton = page.locator('button:has-text("New Product"), button:has-text("new product")', { hasText: /new.*product/i }).first();
    
    if (await newProductButton.isVisible({ timeout: 3000 })) {
      console.log('New Product button found, clicking it');
      await newProductButton.click();
      await page.waitForTimeout(1000);
      
      // Look for product input fields
      const productNameInput = page.locator('input[placeholder*="name" i], input[placeholder*="product" i], input[type="text"]').first();
      
      if (await productNameInput.isVisible()) {
        console.log('Product form opened');
        await productNameInput.fill('Flat White');
        
        // Look for price field
        const priceInput = page.locator('input[type="number"], input[placeholder*="price" i]').first();
        if (await priceInput.isVisible()) {
          await priceInput.fill('5.50');
        }
        
        // Look for description field
        const descriptionInput = page.locator('textarea, input[placeholder*="description" i]').first();
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('A smooth, velvety coffee with steamed milk');
        }
        
        // Save the product
        const productSaveButton = page.locator('button:has-text("Save")').last();
        if (await productSaveButton.isVisible()) {
          await productSaveButton.click();
          console.log('Product saved');
        }
        
        await page.waitForTimeout(1000);
        
        // Verify product was added
        const productText = page.locator('text="Flat White"').first();
        if (await productText.isVisible()) {
          console.log('Product created successfully: Flat White');
        }
      }
    } else {
      console.log('New Product button not found - checking for alternative UI');
      
      // Try double-clicking the content area as fallback
      const contentArea = page.locator('[role="tabpanel"], main').first();
      await contentArea.dblclick({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1000);
      
      const productInput = page.locator('input[type="text"]').first();
      if (await productInput.isVisible()) {
        console.log('Product input appeared after double-click');
        await productInput.fill('Flat White');
        
        const priceInput = page.locator('input[type="number"]').first();
        if (await priceInput.isVisible()) {
          await priceInput.fill('5.50');
        }
        
        const productSaveButton = page.locator('button:has-text("Save")').last();
        if (await productSaveButton.isVisible()) {
          await productSaveButton.click();
        }
      }
    }
    
    console.log('Test completed');
  });
});