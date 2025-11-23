import { expect, test } from '@playwright/test';

const areaName = 'Drinks';
const additionalProduct = 'Pump 750';
const listProductName = 'List Flow Soda';
const updatedListProductName = 'List Flow Soda Zero';

test.describe('Active pick list', () => {
  test('creates a pick list and adds products from the search bar', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

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
    await page.getByLabel('Add product category').click();
    await page.getByRole('option', { name: 'Drinks' }).click();
    await page.getByRole('button', { name: 'Save Product' }).click();

    await expect(page.getByText('Product added.')).toBeVisible();
    await expect(page.getByText('Playwright Cola')).toBeVisible();

    await page.getByRole('button', { name: 'Edit Playwright Cola' }).click();

    const editNameField = page.getByLabel('Name').nth(1);
    await expect(editNameField).toBeVisible();
    await editNameField.fill('Playwright Cola Zero');

    const saveButton = page.locator('[aria-label="Save product"]');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText('Playwright Cola Zero')).toBeVisible();
  });

  test('adds, edits, and deletes a product directly from the list', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Manage Products' }).click();

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(listProductName);
    await page.getByLabel('Add product category').click();
    await page.getByRole('option', { name: areaName }).click();
    await page.getByRole('button', { name: 'Save Product' }).click();

    await expect(page.getByText('Product added.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${listProductName}` })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${listProductName}` }).click();

    const editListNameField = page.getByLabel('Name').last();
    await expect(editListNameField).toBeVisible();
    await editListNameField.fill(updatedListProductName);

    const listSaveButton = page.getByLabel('Save product');
    await expect(listSaveButton).toBeEnabled();
    await listSaveButton.click();

    await expect(page.getByText('Product updated.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${updatedListProductName}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${listProductName}` })).toHaveCount(0);

    await page.getByRole('button', { name: `Delete ${updatedListProductName}` }).click();

    await expect(page.getByText('Product deleted.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${updatedListProductName}` })).toHaveCount(0);
    await expect(page.getByText(updatedListProductName)).toHaveCount(0);
  });
});
