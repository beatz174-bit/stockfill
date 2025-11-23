import { expect, test } from '@playwright/test';

const areaName = 'Drinks';
const additionalProduct = 'Pump 750';
const secondaryProduct = 'Mount Franklin 600ml';

test.describe('Active pick list', () => {
  test('adds a product via search and renders it with quantity and packaging', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.fill('Mount Franklin 600ml');
    await page
      .getByRole('option', { name: /Mount Franklin 600ml \(Drinks\)/i })
      .first()
      .click();

    await expect(page.getByText('Mount Franklin 600ml', { exact: true })).toBeVisible();
    await expect(page.getByText('Qty: 1 unit')).toBeVisible();
  });

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

  test('adds a product to an existing pick list from the search input', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    await page.getByRole('button', { name: 'Save and Return' }).click();

    await expect(page.getByRole('heading', { name: 'Pick Lists' })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(areaName, 'i') }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.click();
    await searchInput.fill(additionalProduct);

    const productOption = page.getByRole('option', {
      name: new RegExp(`${additionalProduct} \\(${areaName}\\)`, 'i'),
    });
    await expect(productOption).toBeVisible();
    await productOption.click();

    await expect(page.getByText(additionalProduct).first()).toBeVisible();
    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible();
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

  test('toggles a product to picked and updates status indicators', async ({ page }) => {
    await page.goto('/');

  test('marks every item as picked when completing the pick list', async ({ page }) => {
    await page.goto('/');

  test('toggles packaging type and persists the selection', async ({ page }) => {
    await page.goto('/');

  test('lets a user mark an item as picked then revert it back to pending', async ({ page }) => {
    await page.goto('/');

  test('removes a product from the pick list when deleted', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
    await page.getByRole('link', { name: 'Create Pick List' }).click();
    await page.getByLabel('Area').click();
    await page.getByRole('option', { name: areaName }).first().click();
    await page.getByRole('button', { name: 'Save Pick List' }).click();

    const productsToAdd = ['Pump 750', 'Nutrient Water Focus', 'Mount Franklin 600ml'];
    const searchInput = page.getByPlaceholder('Search products');

    for (const productName of productsToAdd) {
      await searchInput.click();
      await searchInput.fill(productName);
      await page
        .getByRole('option', { name: new RegExp(`${productName} \\(${areaName}\\)`, 'i') })
        .first()
        .click();

      await expect(page.getByText(productName).first()).toBeVisible();
    }

    const pickStatusToggles = page.getByLabel('Toggle picked status');
    await expect(pickStatusToggles).toHaveCount(productsToAdd.length);

    for (let index = 0; index < productsToAdd.length; index += 1) {
      await expect(pickStatusToggles.nth(index)).not.toBeChecked();
    }

    await page.getByRole('button', { name: 'Pick Complete' }).click();

    for (let index = 0; index < productsToAdd.length; index += 1) {
      await expect(pickStatusToggles.nth(index)).toBeChecked();
    }

    const showPickedToggle = page.getByRole('checkbox', { name: 'Show picked' });
    await expect(showPickedToggle).toBeChecked();
    await expect(showPickedToggle).toBeDisabled();
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
    const pickedToggle = page.getByLabel('Toggle picked status');
    await expect(pickedToggle).not.toBeChecked();
    await pickedToggle.click();
    await expect(pickedToggle).toBeChecked();

    const showPickedToggle = page.getByLabel('Show picked');
    await expect(showPickedToggle).toBeChecked();
    await expect(showPickedToggle).toBeDisabled();
    const increaseButton = page.getByLabel('Increase quantity');
    await increaseButton.click();
    await expect(page.getByText('Qty: 2 unit')).toBeVisible();

    await page.getByLabel('Switch to carton packaging').click();
    await expect(page.getByText('Qty: 2 carton')).toBeVisible();

    await page.getByLabel('Decrease quantity').click();
    await expect(page.getByText('Qty: 1 carton')).toBeVisible();

    await page.getByLabel('Switch to unit packaging').click();
    await expect(page.getByText('Qty: 1 unit')).toBeVisible();

    await increaseButton.click();
    await increaseButton.click();
    await page.getByLabel('Switch to carton packaging').click();
    await expect(page.getByText('Qty: 3 carton')).toBeVisible();

    await page.getByRole('button', { name: 'Save and Return' }).click();
    await expect(page.getByRole('heading', { name: 'Pick Lists' })).toBeVisible();

    await page.reload();
    await page.getByRole('link', { name: areaName }).first().click();
    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();
    await expect(page.getByText('Qty: 3 carton')).toBeVisible();
    await expect(page.getByLabel('Switch to unit packaging')).toBeVisible();
    const itemStatusToggle = page.getByLabel('Toggle picked status').first();
    const showPickedToggle = page.getByLabel('Show picked');

    await expect(itemStatusToggle).not.toBeChecked();
    await expect(showPickedToggle).toBeEnabled();

    await itemStatusToggle.check();

    await expect(itemStatusToggle).toBeChecked();
    await expect(showPickedToggle).toBeDisabled();

    await itemStatusToggle.uncheck();

    await expect(itemStatusToggle).not.toBeChecked();
    await expect(showPickedToggle).toBeEnabled();
    const productRow = page.getByText(additionalProduct).locator(
      'xpath=ancestor::div[contains(@class, "MuiStack-root")]//button[@aria-label="Delete item"]',
    );

    await expect(page.getByText(additionalProduct).first()).toBeVisible();
    await productRow.first().click();

    await expect(page.getByRole('dialog', { name: 'Delete item' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText(additionalProduct).first()).not.toBeVisible();
  });
});
