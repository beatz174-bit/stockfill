// src/screens/ManageProductsScreen.additional.test.tsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageProductsScreen from './ManageProductsScreen';

const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();

vi.mock('../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
  useCategories: () => mockUseCategories(),
}));

// DB mock
const productsDb = {
  get: vi.fn(),
  put: vi.fn(),
  where: vi.fn(),    // must return { equals: () => ({ first: async () => ... }) }
  filter: vi.fn(),
};
const categoriesDb = {
  where: vi.fn(),
  get: vi.fn(),
  add: vi.fn(),
};
const pickListsDb = {
  toArray: vi.fn(),
};
const pickItemsDb = {
  add: vi.fn(),
};
const mockDb: any = {
  products: productsDb,
  categories: categoriesDb,
  pickLists: pickListsDb,
  pickItems: pickItemsDb,
  transaction: vi.fn(async (_mode: string, ...args: any[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') return cb();
    return undefined;
  }),
};

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

vi.mock('uuid', () => ({ v4: () => 'new-product-id' }));

beforeEach(() => {
  mockUseProducts.mockReset();
  mockUseCategories.mockReset();
  Object.values(productsDb).forEach((f) => typeof f === 'function' && (f as any).mockReset && (f as any).mockReset());
  Object.values(categoriesDb).forEach((f) => typeof f === 'function' && (f as any).mockReset && (f as any).mockReset());
  pickListsDb.toArray.mockReset();
  pickItemsDb.add.mockReset();
  mockDb.transaction.mockReset();

  // Default product DB stubs
  productsDb.where.mockImplementation(() => ({ equals: () => ({ first: async () => undefined }) }));
  productsDb.filter.mockImplementation(() => ({ delete: vi.fn() }));
});

describe('ManageProductsScreen update product category creation branch', () => {
  it('creates a new category when updates.category is an unknown name and saves product', async () => {
    const existingProduct = {
      id: 'prod-2',
      name: 'Another Product',
      category: 'cat-old',
      barcode: '654321',
      unit_type: 'unit',
      bulk_name: 'pack',
      archived: false,
      created_at: 0,
      updated_at: 0,
    };

    mockUseProducts.mockReturnValue([existingProduct]);
    mockUseCategories.mockReturnValue([]); // no categories available

    productsDb.get.mockResolvedValue(existingProduct);

    // products.where('barcode').equals(value).first() must exist for uniqueness check
    productsDb.where.mockImplementation((field?: string) => ({
      equals: (value?: string) => ({
        first: async () => undefined,
      }),
    }));

    // categories.where('name').equals(...).first => undefined (no matching category name)
    categoriesDb.where.mockImplementation(() => ({ equals: () => ({ first: async () => undefined }) }));
    categoriesDb.get.mockResolvedValue(undefined); // isExistingId check -> undefined
    categoriesDb.add.mockResolvedValue('new-cat-id');

    productsDb.put.mockResolvedValue('prod-2');
    productsDb.filter.mockImplementation(() => ({ delete: vi.fn() }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    // Open edit for the product
    await user.click(screen.getByLabelText(/edit another product/i));

    // Find the category field corresponding to that row (value should be 'cat-old')
    const categoryInputs = screen.getAllByLabelText(/category/i);
    const categoryField = categoryInputs.find((i) => (i as HTMLInputElement).value === 'cat-old') as HTMLInputElement;
    expect(categoryField).toBeDefined();

    // Change category to a new name that doesn't exist
    fireEvent.change(categoryField, { target: { value: 'New Category Name' } });

    // Click product-row Save button
    const saveButtons = screen.getAllByRole('button', { name: /save product/i });
    const productSaveButton = saveButtons.find((b) => b.getAttribute('aria-label') === 'Save product' || b.querySelector('svg') !== null) ?? saveButtons[0];
    expect(productSaveButton).toBeDefined();
    await user.click(productSaveButton as HTMLElement);

    // Wait for categories.add to be called (new category created) and product saved
    await waitFor(() => {
      expect(categoriesDb.add).toHaveBeenCalled();
      expect(productsDb.put).toHaveBeenCalled();
    });
  });
});
