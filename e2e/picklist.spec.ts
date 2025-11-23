import { expect, test } from '@playwright/test';

const areaName = 'Drinks';
const additionalProduct = 'Pump 750';
const secondaryProduct = 'Mount Franklin 600ml';

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

  test('toggles picked visibility and disables the filter when all items are picked', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.click();
    await searchInput.fill(secondaryProduct);
    await page
      .getByRole('option', { name: new RegExp(`${secondaryProduct} \\(${areaName}\\)`, 'i') })
      .first()
      .click();

    await searchInput.fill(additionalProduct);
    await page
      .getByRole('option', { name: new RegExp(`${additionalProduct} \\(${areaName}\\)`, 'i') })
      .first()
      .click();

    const showPickedToggle = page.getByLabel('Show picked');
    const itemToggles = page.getByRole('checkbox', { name: 'Toggle picked status' });

    await expect(showPickedToggle).toBeChecked();
    await expect(page.getByText(secondaryProduct)).toBeVisible();
    await expect(page.getByText(additionalProduct)).toBeVisible();

    await itemToggles.first().check();
    await expect(itemToggles.first()).toBeChecked();

    await showPickedToggle.click();
    await expect(page.getByText(secondaryProduct)).toHaveCount(0);
    await expect(page.getByText(additionalProduct)).toBeVisible();

    await showPickedToggle.click();
    await expect(showPickedToggle).toBeChecked();
    await expect(page.getByText(secondaryProduct)).toBeVisible();

    await itemToggles.nth(1).check();
    await expect(itemToggles.nth(1)).toBeChecked();

    await expect(showPickedToggle).toBeDisabled();
    await expect(showPickedToggle).toBeChecked();
  });
});
