import { expect, test } from '@playwright/test';
import {
  ensureProductsExist,
  areaName,
  waitForScreenHeading,
  openSelect,
} from './test-helpers';

test.describe('Product category filters', () => {
  test('shows only products from the selected category', async ({ page }) => {
    // Ensure products exist in the categories we will test.
    // ensureProductsExist also ensures the category exists.
    await ensureProductsExist(page, ['Smiths Salt n Vinegar 90g'], 'Chips');
    await ensureProductsExist(page, ['Pump 750'], areaName); // Drinks
    await ensureProductsExist(page, ['Mars Bar'], 'Confectionery');

    // Go to Manage Products
    await page.goto('/');
    await waitForScreenHeading(page, 'StockFill');

    await page.getByRole('link', { name: 'Manage Products' }).click();
    await waitForScreenHeading(page, 'Manage Products');

    // Use robust helper to open the category filter and select 'Chips'
    await openSelect(page, 'Filter by category', 'Chips');

    // Wait briefly and assert only Chips products are shown
    await expect(
      page.getByRole('button', { name: 'Edit Smiths Salt n Vinegar 90g' }).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Edit Pump 750' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit Mars Bar' })).toHaveCount(0);
  });
});
