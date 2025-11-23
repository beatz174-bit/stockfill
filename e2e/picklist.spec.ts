import { expect, test } from '@playwright/test';

const areaName = 'Drinks';
const firstProduct = 'Mount Franklin 600ml';
const secondProduct = 'Mars Bar';

test.describe('Active pick list', () => {
  test('allows creating a pick list and adding products without crashing', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.click();
    await searchInput.fill(firstProduct);
    await page
      .getByRole('option', { name: new RegExp(`${firstProduct} \\(${areaName}\\)`, 'i') })
      .first()
      .click();

    await expect(page.getByText(firstProduct).first()).toBeVisible();
    await expect(page.getByText(/Qty: 1 unit/i)).toBeVisible();

    await searchInput.click();
    await searchInput.fill(secondProduct);
    await page.getByRole('option', { name: new RegExp(secondProduct, 'i') }).first().click();

    await expect(page.getByText(secondProduct).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save and Return' })).toBeEnabled();
  });
});
