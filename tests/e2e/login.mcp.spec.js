const { test, expect } = require('@playwright/test');

test.describe('MCP Login', () => {
  test('logs in with valid credentials and reaches /shop', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input#email', 'mbathie@gmail.com');
    await page.fill('input#password', 'test');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/shop', { timeout: 30000 });
    await expect(page).toHaveURL(/.*\/shop/);
  });
});

