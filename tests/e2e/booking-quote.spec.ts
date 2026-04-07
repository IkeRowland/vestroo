import { test, expect } from '@playwright/test';

import { e2eQuoteFixturePath } from './helpers/booking-fixture-url';

test.describe('Booking quote step (dev fixture)', () => {
  test('reaches quote UI after fixture seed (hourly hire stub)', async ({ page }) => {
    await page.goto(e2eQuoteFixturePath);
    await expect(page).toHaveURL(/\/book\/quote/);
    await expect(page.getByRole('heading', { name: /review your quote/i })).toBeVisible();
    await expect(page.getByText(/available vehicles/i)).toBeVisible();
    await expect(page.getByText(/executive sedan \(e2e\)/i)).toBeVisible();
  });

  test('selects a vehicle and enables Continue', async ({ page }) => {
    await page.goto(e2eQuoteFixturePath);
    await expect(page).toHaveURL(/\/book\/quote/);
    await page.getByText(/executive sedan \(e2e\)/i).click();
    const continueBtn = page.getByRole('button', { name: /^continue$/i });
    await expect(continueBtn).toBeEnabled();
  });
});
