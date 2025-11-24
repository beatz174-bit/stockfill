import { expect, Page, test } from '@playwright/test';

const areaName = 'Drinks';
const additionalProduct = 'Pump 750';
const listProductName = 'List Flow Soda';
const updatedListProductName = 'List Flow Soda Zero';
const searchTerm = 'E2E Search';
const matchingProducts = [`${searchTerm} Alpha`, `${searchTerm} Beta`];
const nonMatchingProduct = 'E2E Other Gamma';
const secondaryProduct = 'Mount Franklin 600ml';

const navigateToNewPickList = async (page: Page) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'StockFill' })).toBeVisible();
  await page.getByRole('link', { name: 'Create Pick List' }).click();
  await page.getByLabel('Area').click();
  await page.getByRole('option', { name: areaName }).first().click();
  await page.getByRole('button', { name: 'Save Pick List' }).click();

  await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();
};

const addProductToPickList = async (page: Page, productName: string) => {
  const searchInput = page.getByPlaceholder('Search products');
  await searchInput.click();
  await searchInput.fill(productName);
  const productOption = page
    .getByRole('option', { name: new RegExp(`${productName} \\(${areaName}\\)`, 'i') })
    .first();

  await expect(productOption).toBeVisible({ timeout: 15000 });
  await productOption.click();

  await expect(page.getByText(productName).first()).toBeVisible({ timeout: 15000 });
};

test.describe('Active pick list', () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test('adds a product via search and renders it with quantity and packaging', async ({ page }) => {
    await navigateToNewPickList(page);

    const searchInput = page.getByPlaceholder('Search products');
    await searchInput.fill(secondaryProduct);
    await page
      .getByRole('option', { name: new RegExp(`${secondaryProduct} \\(${areaName}\\)`, 'i') })
      .first()
      .click();

    await expect(page.getByText(secondaryProduct, { exact: true })).toBeVisible();
    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible({ timeout: 10000 });
  });

  test('creates a pick list and adds products from the search bar', async ({ page }) => {
    await navigateToNewPickList(page);

    await addProductToPickList(page, additionalProduct);

    await expect(page.getByRole('button', { name: 'Save and Return' })).toBeEnabled();
  });

  test('adds a product to an existing pick list from the search input', async ({ page }) => {
    await navigateToNewPickList(page);
    await page.getByRole('button', { name: 'Save and Return' }).click();

    await expect(page.getByRole('heading', { name: 'Pick Lists' })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(areaName, 'i') }).click();

    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();

    await addProductToPickList(page, additionalProduct);

    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible({ timeout: 10000 });
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

  test('filters the manage products list using the search bar', async ({ page }) => {
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
    await expect(
      page.getByRole('button', { name: `Edit ${listProductName}`, exact: true }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: `Delete ${updatedListProductName}` }).click();

    await expect(page.getByText('Product deleted.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${updatedListProductName}` })).toHaveCount(0);
    await expect(page.getByText(updatedListProductName)).toHaveCount(0);

    const addProduct = async (name: string) => {
      await page.getByLabel('Name').fill(name);
      await page.getByLabel('Add product category').click();
      await page.getByRole('option', { name: areaName }).first().click();
      await page.getByRole('button', { name: 'Save Product' }).click();
      await expect(page.getByText('Product added.')).toBeVisible();
      await expect(page.getByRole('button', { name: `Edit ${name}` })).toBeVisible();
    };

    for (const productName of [...matchingProducts, nonMatchingProduct]) {
      await addProduct(productName);
    }

    const searchInput = page.getByPlaceholder('Search');
    await searchInput.fill(searchTerm);

    for (const productName of matchingProducts) {
      await expect(page.getByRole('button', { name: `Edit ${productName}` })).toBeVisible();
    }

    await expect(page.getByRole('button', { name: `Edit ${nonMatchingProduct}` })).toHaveCount(0);
  });

  test('marks every item as picked when completing the pick list', async ({ page }) => {
    await navigateToNewPickList(page);

    const productsToAdd = ['Pump 750', 'Nutrient Water Focus', 'Mount Franklin 600ml'];
    for (const productName of productsToAdd) {
      await addProductToPickList(page, productName);
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
  });

  test('adjusts item quantities with increment and decrement controls', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const quantityLabel = page.getByText(/Qty:\s*1\s+unit/i);
    await expect(quantityLabel).toBeVisible();

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(page.getByText(/Qty:\s*2\s+unit/i)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText(/Qty:\s*2\s+unit/i)).toBeVisible();

    const decrementButton = page.getByRole('button', { name: 'Decrease quantity' });
    await decrementButton.click();
    await decrementButton.click();
    await decrementButton.click();

    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible();
  });

  test('closes mobile controls with the close button and backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const productRow = page
      .getByText(additionalProduct, { exact: true })
      .locator('xpath=ancestor::div[contains(@class, "MuiStack-root")]')
      .first();
    const controlsDialog = page.getByRole('dialog', { name: additionalProduct });

    await productRow.click();
    await expect(controlsDialog).toBeVisible();

    await page.getByRole('button', { name: 'Close controls' }).click();
    await expect(controlsDialog).toBeHidden();

    await productRow.click();
    await expect(controlsDialog).toBeVisible();

    await page.locator('.MuiBackdrop-root').click({ position: { x: 10, y: 10 } });
    await expect(controlsDialog).toBeHidden();
  });

  test('toggles picked visibility and disables the filter when all items are picked', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, secondaryProduct);
    await addProductToPickList(page, additionalProduct);

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

  test('toggles packaging type and persists the selection', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const pickedToggle = page.getByLabel('Toggle picked status');
    await expect(pickedToggle).not.toBeChecked();
    await pickedToggle.click();
    await expect(pickedToggle).toBeChecked();

    const showPickedToggle = page.getByLabel('Show picked');
    await expect(showPickedToggle).toBeChecked();
    await expect(showPickedToggle).toBeDisabled();

    const increaseButton = page.getByLabel('Increase quantity');
    await increaseButton.click();
    await expect(page.getByText(/Qty:\s*2\s+unit/i)).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Switch to carton packaging').click();
    await expect(page.getByText(/Qty:\s*2\s+carton/i)).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Decrease quantity').click();
    await expect(page.getByText(/Qty:\s*1\s+carton/i)).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Switch to unit packaging').click();
    await expect(page.getByText(/Qty:\s*1\s+unit/i)).toBeVisible({ timeout: 10000 });

    await increaseButton.click();
    await increaseButton.click();
    await page.getByLabel('Switch to carton packaging').click();
    await expect(page.getByText(/Qty:\s*3\s+carton/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Save and Return' }).click();
    await expect(page.getByRole('heading', { name: 'Pick Lists' })).toBeVisible();

    await page.reload();
    await page.getByRole('link', { name: areaName }).first().click();
    await expect(page.getByRole('heading', { name: `${areaName} List` })).toBeVisible();
    await expect(page.getByText(/Qty:\s*3\s+carton/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Switch to unit packaging')).toBeVisible();
  });

  test('shows inline controls on wide view without the popup trigger', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const productRow = page
      .getByText(additionalProduct)
      .locator('xpath=ancestor::div[contains(@class, "MuiStack-root")]')
      .first();

    await expect(productRow.getByLabel('Switch to carton packaging')).toBeVisible();
    await expect(productRow.getByLabel('Decrease quantity')).toBeVisible();
    await expect(productRow.getByLabel('Increase quantity')).toBeVisible();
    await expect(productRow.getByLabel('Delete item')).toBeVisible();
    await expect(productRow.getByLabel('Open item controls')).toHaveCount(0);
  });

  test('lets a user mark an item as picked then revert it back to pending', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

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
  });

  test('removes a product from the pick list when deleted', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const productRow = page.getByText(additionalProduct).first();

    await expect(productRow).toBeVisible();
    await productRow.click();

    const controlsDialog = page.getByRole('dialog', { name: additionalProduct });
    await expect(controlsDialog).toBeVisible();

    await controlsDialog.getByRole('button', { name: 'Delete item' }).click();

    const confirmDialog = page.getByRole('dialog', { name: 'Delete item' });
    await expect(confirmDialog).toBeVisible();

    const cancelButton = confirmDialog.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(confirmDialog).not.toBeVisible();
    await expect(controlsDialog).not.toBeVisible();

    await productRow.click();
    await expect(page.getByRole('dialog', { name: additionalProduct })).toBeVisible();
    await page.getByRole('button', { name: 'Delete item' }).click();

    const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await expect(page.getByText(additionalProduct)).toHaveCount(0);
  });
});

test.describe('Active pick list responsive controls on mobile', () => {
  test.use({ viewport: { width: 430, height: 900 } });

  test('shows popup controls on narrow screens and hides inline buttons', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    const productRow = page
      .getByText(additionalProduct)
      .locator('xpath=ancestor::div[contains(@class, "MuiStack-root")]')
      .first();

    await expect(productRow.getByLabel('Switch to carton packaging')).toHaveCount(0);
    await expect(productRow.getByLabel('Decrease quantity')).toHaveCount(0);
    await expect(productRow.getByLabel('Increase quantity')).toHaveCount(0);
    await expect(productRow.getByLabel('Delete item')).toHaveCount(0);

    const controlsButton = productRow.getByLabel('Open item controls');
    await expect(controlsButton).toBeVisible();
    await controlsButton.click();

    const itemDialog = page.getByRole('dialog', { name: additionalProduct });
    await expect(itemDialog).toBeVisible();
    const quantityDisplay = itemDialog.getByText(/Quantity/i);

    await expect(quantityDisplay).toHaveText(/Quantity:\s*1\s+unit/i, { timeout: 10000 });
    await expect(itemDialog.getByLabel('Increase quantity')).toBeVisible();

    await itemDialog.getByLabel('Increase quantity').click();
    await expect(quantityDisplay).toHaveText(/Quantity:\s*2\s+unit/i, { timeout: 10000 });
    await itemDialog.getByLabel('Switch to carton packaging').click();
    await expect(quantityDisplay).toHaveText(/Quantity:\s*2\s+carton/i, { timeout: 10000 });

    await itemDialog.getByLabel('Delete item').click();
    await expect(page.getByRole('dialog', { name: 'Delete item' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog', { name: additionalProduct })).toBeVisible();
  });
});
