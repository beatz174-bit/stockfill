import { expect, Page, test } from '@playwright/test';

import {
  areaName,
  additionalProduct,
  listProductName,
  updatedListProductName,
  searchTerm,
  matchingProducts,
  nonMatchingProduct,
  secondaryProduct,
  waitForScreenHeading,
  openSelect,
  ensureCategoryExists,
  expectProductQuantity,
  addProductToPickList,
  navigateToNewPickList,
} from './test-helpers';


/* -----------------------
   Test suite
   ----------------------- */
test.describe('Active pick list', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('adds a product via search and renders it with quantity and packaging', async ({ page }) => {
    await navigateToNewPickList(page);

    // Add product via search
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill(secondaryProduct);
    await page.getByRole('option', { name: new RegExp(`${secondaryProduct} \\(${areaName}\\)`, 'i') }).first().click();

    // Product should appear in pick list as "1 x Mount Franklin 600ml"
    await expectProductQuantity(page, secondaryProduct, 1, 15000);
  });

  test('creates a pick list and adds products from the search bar', async ({ page }) => {
    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);
    await expect(page.getByRole('button', { name: 'Save and Return' })).toBeEnabled();
  });

  test('adds a product to an existing pick list from the search input', async ({ page }) => {
    await navigateToNewPickList(page);
    await page.getByRole('button', { name: 'Save and Return' }).click();

    await waitForScreenHeading(page, 'Pick Lists');
    await page.getByRole('link', { name: new RegExp(areaName, 'i') }).click();
    await waitForScreenHeading(page, `${areaName} List`);

    await addProductToPickList(page, additionalProduct);

    // Assert product row visible, and shows "1 x <product>"
    await expectProductQuantity(page, additionalProduct, 1, 15000);
  });

  test('allows adding and editing products from the manage products screen', async ({ page }) => {

    await ensureCategoryExists(page, areaName);

    await page.goto('/');
    await waitForScreenHeading(page, 'StockFill');



    await page.getByRole('link', { name: 'Manage Products' }).click();
    await waitForScreenHeading(page, 'Manage Products');

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('Playwright Cola');

    await openSelect(page, 'Add product category', 'Drinks', 'select-add-product-category');

    const saveButton = page.getByRole('button', { name: 'Save Product' });
    if ((await saveButton.count()) > 0) {
      await saveButton.first().click();
    } else {
      await page.locator('[aria-label="Save product"]').first().click();
    }

    await expect(page.getByText('Product added.')).toBeVisible();
    await expect(page.getByText('Playwright Cola')).toBeVisible();

    await page.getByRole('button', { name: 'Edit Playwright Cola' }).click();
    const editNameField = page.getByLabel('Name').nth(1);
    await expect(editNameField).toBeVisible();
    await editNameField.fill('Playwright Cola Zero');

    const saveIcon = page.locator('[aria-label="Save product"]').first();
    await expect(saveIcon).toBeVisible();
    await saveIcon.click();

    await expect(page.getByText('Playwright Cola Zero')).toBeVisible();
  });

  test('filters the manage products list using the search bar', async ({ page }) => {

    await ensureCategoryExists(page, areaName);

    await page.goto('/');
    await waitForScreenHeading(page, 'StockFill');

    await page.getByRole('link', { name: 'Manage Products' }).click();
    await waitForScreenHeading(page, 'Manage Products');

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(listProductName);
    await openSelect(page, 'Add product category', areaName, 'select-add-product-category');

    const saveButton = page.getByRole('button', { name: 'Save Product' });
    if ((await saveButton.count()) > 0) {
      await saveButton.first().click();
    } else {
      await page.locator('[aria-label="Save product"]').first().click();
    }

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
    await expect(page.getByRole('button', { name: `Edit ${listProductName}`, exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: `Delete ${updatedListProductName}` }).click();
    await expect(page.getByText('Product deleted.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${updatedListProductName}` })).toHaveCount(0);
    await expect(page.getByText(updatedListProductName)).toHaveCount(0);

    const addProduct = async (name: string) => {
      await page.getByLabel('Name').fill(name);
      await openSelect(page, 'Add product category', areaName, 'select-add-product-category');
      await page.getByRole('button', { name: 'Save Product' }).first().click();
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

    // initial quantity = 1
    await expectProductQuantity(page, additionalProduct, 1);

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expectProductQuantity(page, additionalProduct, 2);

    await page.reload();
    await expectProductQuantity(page, additionalProduct, 2);

    const decrementButton = page.getByRole('button', { name: 'Decrease quantity' });
    await decrementButton.click();
    await decrementButton.click();
    await decrementButton.click();

    await expectProductQuantity(page, additionalProduct, 1);

    await page.reload();
    await expectProductQuantity(page, additionalProduct, 1);
  });

  test('closes mobile controls with the close button and backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    // Find the title row which contains "1 x Pump 750" and then get its clickable ancestor (role="button")
    const titleRow = page.locator('[data-testid="pick-item-title-row"]', { hasText: additionalProduct }).first();
    await titleRow.waitFor({ state: 'visible', timeout: 10000 });

    // The clickable mobile row has role="button" (set only for narrow screens)
    const productRow = titleRow.locator('xpath=ancestor::div[@role="button"]').first();
    const controlsDialog = page.getByRole('dialog', { name: additionalProduct });

    // open controls by clicking the mobile row
    await productRow.click();
    await expect(controlsDialog).toBeVisible();

    // close controls using the Close button (in the dialog header)
    await page.getByRole('button', { name: 'Close controls' }).click();
    await expect(controlsDialog).toBeHidden();

    // re-open and close by clicking backdrop
    await productRow.click();
    await expect(controlsDialog).toBeVisible();

    await page.locator('.MuiBackdrop-root').click({ position: { x: 10, y: 10 }, force: true });
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

    // increase quantity to 2
    const increaseButton = page.getByLabel('Increase quantity');
    await increaseButton.click();
    await expectProductQuantity(page, additionalProduct, 2);

    // switch to carton packaging (icon button toggles packaging)
    await page.getByLabel('Switch to carton packaging').click();

    // Desktop UI shows packaging via the switch icon state; assert the switch now allows switching back to unit
    await expect(page.getByLabel('Switch to unit packaging')).toBeVisible();

    // decrease and then check quantity
    await page.getByLabel('Decrease quantity').click();
    await expectProductQuantity(page, additionalProduct, 1);

    // switch back to unit packaging
    await page.getByLabel('Switch to unit packaging').click();
    await expect(page.getByLabel('Switch to carton packaging')).toBeVisible();

    // increase twice and then switch to carton and assert quantity 3
    await increaseButton.click();
    await increaseButton.click();
    await page.getByLabel('Switch to carton packaging').click();
    await expectProductQuantity(page, additionalProduct, 3);

    await page.getByRole('button', { name: 'Save and Return' }).click();
    await waitForScreenHeading(page, 'Pick Lists');

    await page.reload();
    await page.getByRole('link', { name: areaName }).first().click();
    await waitForScreenHeading(page, `${areaName} List`);
    await expectProductQuantity(page, additionalProduct, 3);
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

  test('responsive controls on mobile show popup controls and hide inline buttons', async ({ page }) => {
    // mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await navigateToNewPickList(page);
    await addProductToPickList(page, additionalProduct);

    // Find the title row which contains the product name, then find its mobile ancestor (role="button")
    const titleRow = page.locator('[data-testid="pick-item-title-row"]', { hasText: additionalProduct }).first();
    await titleRow.waitFor({ state: 'visible', timeout: 10000 });

    const productRow = titleRow.locator('xpath=ancestor::div[@role="button"]').first();

    // On mobile the open-controls icon should be visible and inline increase/decrease buttons hidden
    await expect(productRow.getByLabel('Open item controls')).toBeVisible();
    await expect(productRow.getByLabel('Decrease quantity')).toHaveCount(0);
    await expect(productRow.getByLabel('Increase quantity')).toHaveCount(0);

    // open popup controls by clicking the mobile row, then assert dialog contents
    await productRow.click();
    const dialog = page.getByRole('dialog', { name: additionalProduct });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Increase quantity')).toBeVisible();
  });

});
