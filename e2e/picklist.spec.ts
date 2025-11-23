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
    await page.getByRole('checkbox', { name: 'Chocolates' }).click();
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

  test('allows adding and editing products from the manage products screen', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Manage Products' }).click();

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('Playwright Cola');
    await page.getByLabel('Category').click();
    await page.getByRole('option', { name: 'Drinks' }).click();
    await page.getByRole('button', { name: 'Save Product' }).click();

    await expect(page.getByText('Product added.')).toBeVisible();
    await expect(page.getByText('Playwright Cola')).toBeVisible();

    await page.getByRole('button', { name: 'Edit Playwright Cola' }).click();
    await page.getByLabel('Name').nth(1).fill('Playwright Cola Zero');
    await page.getByRole('button', { name: 'Save product' }).click();

    await expect(page.getByText('Playwright Cola Zero')).toBeVisible();
  });
});
