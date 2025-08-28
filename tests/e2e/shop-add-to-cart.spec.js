const { test, expect } = require('@playwright/test');

// Helper to safely try an action with a timeout, returning boolean
async function tryWithTimeout(fn, timeoutMs = 2000) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return true;
  } catch (_) {
    return false;
  }
}

async function isVisible(locator, timeoutMs = 1500) {
  try {
    await expect(locator).toBeVisible({ timeout: timeoutMs });
    return true;
  } catch (_) {
    return false;
  }
}

async function ensurePin(page) {
  // If a PIN dialog appears, set or enter 1234 depending on mode
  // Mode 1: Set PIN dialog
  const setPinInput = page.getByPlaceholder(/enter 4-digit pin/i);
  if (await isVisible(setPinInput, 2000)) {
    await setPinInput.fill('1234');
    const confirmInput = page.getByPlaceholder(/confirm pin/i);
    await confirmInput.fill('1234');
    const setBtn = page.getByRole('button', { name: /set pin/i }).first();
    await setBtn.click();
    // Wait until dialog disappears or verify dialog appears
    await tryWithTimeout(async () => {
      await expect(page.locator('div[role="dialog"]').first()).not.toBeVisible();
    }, 5000);
    return;
  }

  // Mode 2: Verify PIN dialog
  const pinInput = page.getByPlaceholder(/^PIN$/);
  if (await isVisible(pinInput, 2000)) {
    await pinInput.fill('1234');
    const verifyBtn = page.getByRole('button', { name: /verify( pin)?/i }).first();
    await verifyBtn.click();
    await tryWithTimeout(async () => {
      await expect(page.locator('div[role="dialog"]').first()).not.toBeVisible();
    }, 5000);
  }
}

test.describe('Shop Add To Cart', () => {
  test('adds Cappuccino with variation and mods to cart', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input#email', 'mbathie@gmail.com');
    await page.fill('input#password', 'test');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/shop', { timeout: 2000 });

    // Go to retail shop
    await page.goto('/shop/retail');
    await ensurePin(page);

    // Wait a moment for client-side categories fetch/render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click the Milky folder tile to reveal milky drinks
    const milkyLabel = page.getByText(/^Milky$/).first();
    await expect(milkyLabel).toBeVisible({ timeout: 2000 });
    const milkyTile = milkyLabel.locator('xpath=..').locator('div.cursor-pointer.size-24');
    await milkyTile.click();

    // Click the Cappuccino product card
    const capLabel = page.getByText(/^Cappuccino$/).first();
    await expect(capLabel).toBeVisible({ timeout: 2000 });
    const capTile = capLabel.locator('xpath=..').locator('div.cursor-pointer');
    await capTile.click();

    // We expect the product detail sheet to be open now
    // Select the first available variation
    const variationsHeader = page.getByText('Variations');
    await variationsHeader.waitFor({ timeout: 2000 });

    // Click the first variation row under Variations
    const firstVariation = variationsHeader.locator('xpath=..').locator('div.cursor-pointer').first();
    await firstVariation.click();

    // Wait for Add to Cart to become enabled
    const addToCart = page.getByRole('button', { name: 'Add to Cart' });
    await expect(addToCart).toBeEnabled({ timeout: 2000 });

    // If any modifications are available, select a couple
    // Mod options have a clickable container with padding classes
    const modOptions = page.locator('div.cursor-pointer.p-2');
    const modCount = await modOptions.count();
    if (modCount > 0) {
      // Click up to 2 mods if present
      const toClick = Math.min(modCount, 2);
      for (let i = 0; i < toClick; i++) {
        await modOptions.nth(i).click();
      }
    }

    // Capture the total shown in the product detail before adding
    const totalRow = page.getByText(/^total$/i).first().locator('xpath=..');
    const detailAmountText = (await totalRow.locator('css=div.ml-auto').first().innerText()).trim();
    const parseMoney = (s) => parseFloat(s.replace(/[^0-9.]/g, ''));
    const detailSubtotal = parseMoney(detailAmountText);
    const expectedWith10pct = `$${(detailSubtotal * 1.10).toFixed(2)}`;

    // Add to cart and wait for Sheet to close/slide away
    await addToCart.click();
    await expect(addToCart).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(250); // allow animation to finish

    // Assert cart shows Cappuccino item (with quantity prefix)
    const itemRow = page.locator('div.flex', { has: page.getByText(/\b1x\s+Cappuccino\b/i) }).first();
    await expect(itemRow).toBeVisible({ timeout: 10000 });

    // Compare the cart line item price with the detail total
    const cartAmountText = (await itemRow.locator('css=div:has-text("$")').last().innerText()).trim();
    // Accept either exact match (subtotal equals line amount) or subtotal + 10% tax, with small tolerance
    const cartVal = parseMoney(cartAmountText);
    const diffDirect = Math.abs(cartVal - detailSubtotal);
    const diffTaxed = Math.abs(cartVal - parseMoney(expectedWith10pct));
    const withinTolerance = Math.min(diffDirect, diffTaxed) <= 0.35; // allow for tax/rounding policies
    expect(withinTolerance, `Cart ${cartAmountText} should match Detail ${detailAmountText} or Taxed ${expectedWith10pct} (diffs: direct=${diffDirect.toFixed(2)}, taxed=${diffTaxed.toFixed(2)})`).toBeTruthy();

    // Also assert Payment button is enabled (cart not empty)
    const paymentBtn = page.getByRole('button', { name: 'Payment' });
    await expect(paymentBtn).toBeEnabled();
  });
});
