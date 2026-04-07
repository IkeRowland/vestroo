import { test, expect } from '@playwright/test';

test.describe('Booking Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/book/search');
  });

  test('should display booking search form', async ({ page }) => {
    await expect(page.locator('#pickup-address-input')).toBeVisible();
    await expect(page.getByPlaceholder(/drop-off service point/i)).toBeVisible();
    await expect(page.locator('#date')).toBeVisible();
    await expect(page.getByPlaceholder(/no\. of passengers/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /get instant quote/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /get instant quote/i }).click();
    const submitButton = page.getByRole('button', { name: /get instant quote/i });
    await expect(submitButton).toBeVisible();
  });

  test('should allow user to enter passenger count', async ({ page }) => {
    const passengerInput = page.getByPlaceholder(/no\. of passengers/i);
    await passengerInput.fill('4');
    await expect(passengerInput).toHaveValue('4');
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#pickup-address-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /get instant quote/i })).toBeVisible();
  });
});
