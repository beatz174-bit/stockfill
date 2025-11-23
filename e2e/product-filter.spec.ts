import { expect, test } from '@playwright/test';

test.describe('Product category filters', () => {
  test('shows only products from the selected category', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Manage Products' }).click();

    const categoryFilter = page.getByLabel('Filter by category');
    await expect(categoryFilter).toBeVisible();

    await categoryFilter.click();
    await page.getByRole('option', { name: 'Chips' }).click();

    await expect(page.getByRole('button', { name: 'Edit Smiths Salt n Vinegar 90g' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Pump 750' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit Mars Bar' })).toHaveCount(0);
  });
});
