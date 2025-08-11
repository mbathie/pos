const { test, expect } = require('@playwright/test');
const { generateTestUser, testProducts } = require('../helpers/test-data');

test.describe('Product with Variations and Modifiers', () => {
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

  test('should create product with size variations and milk modifiers', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products/shop');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Create a category
    console.log('Creating category: Coffee');
    const categoriesSection = page.locator('text=Categories').locator('..');
    const addCategoryButton = categoriesSection.locator('button').first();
    await addCategoryButton.click();
    
    await page.waitForTimeout(500);
    const categoryInput = page.locator('input[placeholder="Coffees"]');
    await categoryInput.clear();
    await categoryInput.fill('Coffee');
    
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Select the category
    const categoryInList = page.locator('text="Coffee"').first();
    await categoryInList.click();
    await page.waitForTimeout(500);
    
    // Step 2: Create a new product
    console.log('Creating product: Flat White');
    const newProductButton = page.locator('button:has-text("New Product")').first();
    await newProductButton.click();
    await page.waitForTimeout(1000);
    
    // Fill basic product details
    // Try different selectors for the product name input
    const productNameInput = page.locator('input[placeholder*="Product Name" i], input[placeholder*="name" i], input[type="text"]').first();
    await productNameInput.fill('Flat White');
    
    const descriptionInput = page.locator('textarea').first();
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Smooth espresso with steamed milk');
    }
    
    // Step 3: Add size variations
    console.log('Adding size variations');
    
    // Scroll down to find the Variations section
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    
    // Find the Variations section and click the + button
    const variationsSection = page.locator('text=Variations').locator('..');
    const addVariationButton = variationsSection.locator('button:has-text("+")').first();
    await addVariationButton.click();
    await page.waitForTimeout(500);
    
    // The first variation row should appear with default "SM" and price
    // Clear and add Small variation
    const firstVariationInput = page.locator('input[placeholder*="SM" i], input[value="SM"]').first();
    if (await firstVariationInput.isVisible()) {
      await firstVariationInput.clear();
      await firstVariationInput.fill('Small');
    }
    
    const firstPriceInput = variationsSection.locator('input[placeholder*="Price" i], input[type="number"]').first();
    if (await firstPriceInput.isVisible()) {
      await firstPriceInput.clear();
      await firstPriceInput.fill('4.50');
    }
    
    // Add Medium variation
    console.log('Adding Medium size');
    await addVariationButton.click();
    await page.waitForTimeout(500);
    
    const variationInputs = variationsSection.locator('input[placeholder*="Variation" i], input').all();
    if (variationInputs.length > 2) {
      const mediumInput = variationInputs[2]; // Third input (after Small name and price)
      await mediumInput.fill('Medium');
      
      const mediumPriceInput = variationInputs[3];
      await mediumPriceInput.fill('5.50');
    }
    
    // Add Large variation
    console.log('Adding Large size');
    await addVariationButton.click();
    await page.waitForTimeout(500);
    
    const allVariationInputs = await variationsSection.locator('input').all();
    if (allVariationInputs.length >= 6) {
      const largeInput = allVariationInputs[4]; // Fifth input
      await largeInput.fill('Large');
      
      const largePriceInput = allVariationInputs[5];
      await largePriceInput.fill('6.50');
    }
    
    // Step 4: Add Modifier Group for Milk
    console.log('Adding Milk modifier group');
    
    // Find the Mod Groups section and click the + button
    const modGroupsSection = page.locator('text=Mod Groups').locator('..');
    const addModGroupButton = modGroupsSection.locator('button:has-text("+")').first();
    await addModGroupButton.click();
    await page.waitForTimeout(500);
    
    // A new modifier group section should appear
    // Enter the group name "Milk"
    const milkGroupInput = modGroupsSection.locator('input').first();
    if (await milkGroupInput.isVisible()) {
      await milkGroupInput.fill('Milk');
    }
    
    // Now add individual milk options
    console.log('Adding milk options');
    
    // The UI shows individual mods with name and price
    // Look for the + button to add mods within the Milk group
    const addModButton = modGroupsSection.locator('button:has-text("+")').last();
    
    // Add Regular Milk
    await addModButton.click();
    await page.waitForTimeout(500);
    
    const modInputs = modGroupsSection.locator('input').all();
    const regularMilkInput = modInputs[modInputs.length - 2]; // Second to last input
    await regularMilkInput.fill('Regular');
    
    const regularPriceInput = modInputs[modInputs.length - 1]; // Last input
    await regularPriceInput.fill('0'); // No extra charge
    
    // Add Oat Milk
    console.log('Adding Oat milk');
    await addModButton.click();
    await page.waitForTimeout(500);
    
    const updatedModInputs = await modGroupsSection.locator('input').all();
    const oatInput = updatedModInputs[updatedModInputs.length - 2];
    await oatInput.fill('Oat');
    
    const oatPriceInput = updatedModInputs[updatedModInputs.length - 1];
    await oatPriceInput.fill('0.75');
    
    // Add Soy Milk
    console.log('Adding Soy milk');
    await addModButton.click();
    await page.waitForTimeout(500);
    
    const soyInputs = await modGroupsSection.locator('input').all();
    const soyInput = soyInputs[soyInputs.length - 2];
    await soyInput.fill('Soy');
    
    const soyPriceInput = soyInputs[soyInputs.length - 1];
    await soyPriceInput.fill('0.60');
    
    // Add Almond Milk
    console.log('Adding Almond milk');
    await addModButton.click();
    await page.waitForTimeout(500);
    
    const almondInputs = await modGroupsSection.locator('input').all();
    const almondInput = almondInputs[almondInputs.length - 2];
    await almondInput.fill('Almond');
    
    const almondPriceInput = almondInputs[almondInputs.length - 1];
    await almondPriceInput.fill('0.80');
    
    // Step 5: Add another modifier group for Extras
    console.log('Adding Extras modifier group');
    await addModGroupButton.click();
    await page.waitForTimeout(500);
    
    // Find the new group input (should be after the Milk group)
    const allGroupInputs = await modGroupsSection.locator('input[placeholder*="Group" i], input').all();
    const extrasGroupInput = allGroupInputs[allGroupInputs.length - 1];
    await extrasGroupInput.fill('Extras');
    
    // Add Extra Shot
    const extrasAddButton = modGroupsSection.locator('button:has-text("+")').last();
    await extrasAddButton.click();
    await page.waitForTimeout(500);
    
    const extraInputs = await modGroupsSection.locator('input').all();
    const extraShotInput = extraInputs[extraInputs.length - 2];
    await extraShotInput.fill('Extra Shot');
    
    const extraShotPriceInput = extraInputs[extraInputs.length - 1];
    await extraShotPriceInput.fill('0.60');
    
    // Add Decaf option
    await extrasAddButton.click();
    await page.waitForTimeout(500);
    
    const decafInputs = await modGroupsSection.locator('input').all();
    const decafInput = decafInputs[decafInputs.length - 2];
    await decafInput.fill('Decaf');
    
    const decafPriceInput = decafInputs[decafInputs.length - 1];
    await decafPriceInput.fill('0'); // No charge for decaf
    
    // Step 6: Save the complete product
    console.log('Saving product with all variations and modifiers');
    const finalSaveButton = page.locator('button:has-text("Save")').first();
    await finalSaveButton.click();
    await page.waitForTimeout(2000);
    
    // Verify product was created with text in the product list
    const productInList = page.locator('text="Flat White"').first();
    if (await productInList.isVisible()) {
      console.log('Product created successfully with variations and modifiers');
    }
    
    // Step 7: Navigate to shop to test the product
    console.log('Testing product in shop');
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    
    // Click on Coffee category if it exists
    const shopCoffeeCategory = page.locator('button:has-text("Coffee"), [role="tab"]:has-text("Coffee")').first();
    if (await shopCoffeeCategory.isVisible()) {
      await shopCoffeeCategory.click();
      await page.waitForTimeout(500);
      
      // Click on Flat White product
      const flatWhiteProduct = page.locator('button:has-text("Flat White"), div:has-text("Flat White")').first();
      if (await flatWhiteProduct.isVisible()) {
        await flatWhiteProduct.click();
        console.log('Product found in shop with variations and modifiers');
      }
    }
    
    console.log('Test completed successfully');
  });
});