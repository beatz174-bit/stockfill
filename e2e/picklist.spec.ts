import { expect, test } from '@playwright/test';

const areaName = 'Drinks';
const chocolateProduct = 'Mars Bar';
const chipsProduct = 'Smiths Salt n Vinegar 90g';
const additionalProduct = 'Pump 750';

test.describe('Active pick list', () => {
  test('creates a pick list with category-prefilled items and adds more products', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByLabel('Category (optional)').click();
    await page.getByRole('option', { name: 'Chocolates' }).click();
    await page.getByRole('checkbox', { name: 'Chips' }).click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();
    await expect(page.getByText(chocolateProduct).first()).toBeVisible();
    await expect(page.getByText(chipsProduct).first()).toBeVisible();

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.click();
    await searchInput.fill(additionalProduct);
    await page
      .getByRole('option', { name: new RegExp(`${additionalProduct} \\(${areaName}\\)`, 'i') })
      .first()
      .click();

    await expect(page.getByText(additionalProduct).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save and Return' })).toBeEnabled();
  });
});
