// e2e/test-helpers.ts
import { expect } from './fixtures';
import type { Page } from '@playwright/test';

/* -----------------------
   Shared constants
   ----------------------- */
export const areaName = 'Drinks';
export const additionalProduct = 'Pump 750';
export const listProductName = 'List Flow Soda';
export const updatedListProductName = 'List Flow Soda Zero';
export const searchTerm = 'E2E Search';
export const matchingProducts = [`${searchTerm} Alpha`, `${searchTerm} Beta`];
export const nonMatchingProduct = 'E2E Other Gamma';
export const secondaryProduct = 'Mount Franklin 600ml';

/* -----------------------
   Small helpers
   ----------------------- */
export const waitForScreenHeading = async (page: Page, heading: string, timeout = 15000) => {
  try {
    await page.locator('text=Loading…').waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // ignore if no fallback
  }
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout });
};

export const openAddProductDialog = async (page: Page) => {
  const dialog = page.getByLabel('Add product dialog');
  const isDialogVisible = (await dialog.count()) > 0 && (await dialog.first().isVisible());
  if (!isDialogVisible) {
    await page.getByRole('button', { name: 'Add product' }).click();
  }
  await dialog.first().waitFor({ state: 'visible', timeout: 5000 });
};

export const openSelect = async (page: Page, label: string, optionName: string, testId?: string) => {
  const tryOpen = async (lbl: string) => {
    // 1) Try testId wrapper if provided
    if (testId) {
      const wrapper = page.getByTestId(testId);
      if ((await wrapper.count()) > 0) {
        await wrapper.first().waitFor({ state: 'visible', timeout: 10000 });

        // native <select>
        const nativeSelect = wrapper.locator('select').first();
        if ((await nativeSelect.count()) > 0) {
          try {
            await nativeSelect.selectOption({ label: optionName });
            return true;
          } catch {
            // fallback
          }
        }

        // click wrapper itself (sometimes opens)
        try {
          await wrapper.first().click();
          const opt = page.getByRole('option', { name: optionName }).first();
          if ((await opt.count()) > 0) {
            await opt.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
            await opt.click().catch(() => {});
            return true;
          }
        } catch {
          // continue
        }

        // inner role=button
        const buttonInside = wrapper.getByRole('button').first();
        if ((await buttonInside.count()) > 0) {
          try {
            await buttonInside.waitFor({ state: 'visible', timeout: 5000 });
            await buttonInside.click();
            const opt = page.getByRole('option', { name: optionName }).first();
            if ((await opt.count()) > 0) {
              await opt.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
              await opt.click().catch(() => {});
              return true;
            }
          } catch {
            // continue
          }
        }

        // MUI select classes
        const selectInside = wrapper.locator('.MuiSelect-root, .MuiSelect-select, .MuiOutlinedInput-root').first();
        if ((await selectInside.count()) > 0) {
          try {
            await selectInside.waitFor({ state: 'visible', timeout: 5000 });
            await selectInside.click();
            const opt = page.getByRole('option', { name: optionName }).first();
            if ((await opt.count()) > 0) {
              await opt.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
              await opt.click().catch(() => {});
              return true;
            }
          } catch {
            // continue
          }
        }
      }
    }

    // 2) combobox role (MUI sometimes exposes combobox)
    try {
      const combo = page.getByRole('combobox', { name: new RegExp(`^${lbl}`, 'i') });
      if ((await combo.count()) > 0) {
        await combo.first().waitFor({ state: 'visible', timeout: 8000 });
        await combo.first().click().catch(() => {});
        const opt = page.getByRole('option', { name: optionName }).first();
        if ((await opt.count()) > 0) {
          await opt.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          await opt.click().catch(() => {});
          return true;
        }
        await page.waitForTimeout(200);
        if ((await opt.count()) > 0) {
          await opt.click().catch(() => {});
          return true;
        }
      }
    } catch {
      // ignore and continue
    }

    // 3) labelled control (native select or clickable)
    try {
      const labelled = page.getByLabel(lbl);
      if ((await labelled.count()) > 0) {
        await labelled.first().waitFor({ state: 'visible', timeout: 8000 });
        const selectElem = labelled.locator('select').first();
        if ((await selectElem.count()) > 0) {
          try {
            await selectElem.selectOption({ label: optionName });
            return true;
          } catch {
            // fallback
          }
        }
        // click labelled control and try option
        await labelled.first().click().catch(() => {});
        const opt2 = page.getByRole('option', { name: optionName }).first();
        if ((await opt2.count()) > 0) {
          await opt2.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          await opt2.click().catch(() => {});
          return true;
        }
      }
    } catch {
      // ignore
    }

    // 4) button with accessible name starting with label
    try {
      const buttonLocator = page.getByRole('button', { name: new RegExp(`^${lbl}`, 'i') });
      if ((await buttonLocator.count()) > 0) {
        await buttonLocator.first().waitFor({ state: 'visible', timeout: 8000 });
        await buttonLocator.first().click().catch(() => {});
        const option = page.getByRole('option', { name: optionName }).first();
        if ((await option.count()) > 0) {
          await option.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          await option.click().catch(() => {});
          return true;
        }
      }
    } catch {
      // ignore
    }

    // 5) try clicking option directly if already visible
    try {
      const optDirect = page.getByRole('option', { name: optionName }).first();
      if ((await optDirect.count()) > 0) {
        await optDirect.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await optDirect.click().catch(() => {});
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  // Try the requested label first
  const ok = await tryOpen(label);
  if (ok) return;

  // If that failed, attempt a small list of fallback labels
  const fallbacks = ['Category', 'Add product category', 'Filter by category'];
  for (const alt of fallbacks) {
    if (alt === label) continue;
    const okAlt = await tryOpen(alt);
    if (okAlt) return;
  }

  throw new Error(`openSelect: failed to open select for label="${label}" option="${optionName}" testId="${testId}"`);
};

/* -----------------------
   Data creation helpers via UI (E2E approach)
   ----------------------- */
export const ensureAreaExists = async (page: Page, name: string) => {
  await page.goto('/');
  await waitForScreenHeading(page, 'StockFill');

  await page.getByRole('link', { name: 'Manage Areas' }).click();
  await waitForScreenHeading(page, 'Manage Areas');

  if ((await page.locator(`text=${name}`).count()) > 0) return;

  const input = page.getByLabel('Area name');
  await input.click();
  await input.fill(name);
  const addButton = page.getByRole('button', { name: 'Add' });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
};

export const ensureCategoryExists = async (page: Page, name: string) => {
  await page.goto('/');
  await waitForScreenHeading(page, 'StockFill');

  await page.getByRole('link', { name: 'Manage Products' }).click();
  await waitForScreenHeading(page, 'Manage Products');

  const editCategories = page.getByRole('button', { name: 'Edit Categories' });
  if ((await editCategories.count()) > 0) {
    await editCategories.first().click();
  } else {
    await page.goto('/categories');
  }
  await waitForScreenHeading(page, 'Manage Categories');

  if ((await page.getByText(name).count()) > 0) return;

  const input = page.getByLabel('Category name');
  await input.click();
  await input.fill(name);
  const addButton = page.getByRole('button', { name: 'Add' });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
};

export const ensureProductsExist = async (page: Page, productNames: string[], categoryName = 'Drinks') => {
  await ensureCategoryExists(page, categoryName);

  await page.goto('/');
  await waitForScreenHeading(page, 'StockFill');
  await page.getByRole('link', { name: 'Manage Products' }).click();
  await waitForScreenHeading(page, 'Manage Products');

  for (const productName of productNames) {
    if ((await page.getByRole('button', { name: `Edit ${productName}` }).count()) > 0) continue;

    await openAddProductDialog(page);

    const nameField = page.getByLabel('Name');
    await nameField.click();
    await nameField.fill(productName);

    try {
      await openSelect(page, 'Add product category', categoryName, 'select-add-product-category');
    } catch {
      await openSelect(page, 'Category', categoryName);
    }

    const saveButton = page.getByRole('button', { name: 'Save Product' });
    if ((await saveButton.count()) > 0) {
      await saveButton.first().click();
    } else {
      await page.locator('[aria-label="Save product"]').first().click();
    }

    await page.getByLabel('Add product dialog').first().waitFor({ state: 'hidden', timeout: 5000 });

    await Promise.race([
      page.getByText('Product added.').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByRole('button', { name: `Edit ${productName}` }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);
  }
};

/* -----------------------
   Assertion helpers for pick items
   ----------------------- */
export const expectProductVisible = async (page: Page, productName: string, timeout = 15000) => {
  await expect(
    page.locator('[data-testid="pick-item-title-row"]', { hasText: productName }).first()
  ).toBeVisible({ timeout });
};

export const expectProductQuantity = async (page: Page, productName: string, quantity: number, timeout = 15000) => {
  const pattern = new RegExp(`^\\s*${quantity}\\s*x\\s*${productName}`, 'i');
  await expect(
    page.locator('[data-testid="pick-item-title-row"]', { hasText: pattern }).first()
  ).toBeVisible({ timeout });
};

/* -----------------------
   Add product helper (uses stable test-id for input)
   ----------------------- */
export const addProductToPickList = async (page: Page, productName: string) => {
  const searchInput = page.getByTestId('product-search-input');
  await searchInput.click();
  await searchInput.fill(productName);

  const productOption = page
    .getByRole('option', { name: new RegExp(`${productName} \\(${areaName}\\)`, 'i') })
    .first();

  await expect(productOption).toBeVisible({ timeout: 15000 });
  await productOption.click();

  // Wait for the pick item to appear (title row containing product name)
  await expectProductVisible(page, productName, 15000);
};

/* -----------------------
   Flow: create pick list and open active list
   ----------------------- */
export const navigateToNewPickList = async (page: Page) => {
  await ensureAreaExists(page, areaName);
  await ensureProductsExist(page, [additionalProduct, secondaryProduct, 'Nutrient Water Focus']);

  await page.goto('/');
  await waitForScreenHeading(page, 'StockFill');

  await page.getByRole('link', { name: 'Create Pick List' }).click();
  await waitForScreenHeading(page, 'Create Pick List');

  await openSelect(page, 'Area', areaName, 'select-area');

  await page.getByRole('button', { name: 'Save Pick List' }).click();
  await waitForScreenHeading(page, `${areaName} List`);
};
