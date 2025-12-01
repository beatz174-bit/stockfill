// src/screens/ManageProductsScreen.test.tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock openFoodFacts before importing the component
vi.mock('../modules/openFoodFacts', () => ({
  fetchProductFromOFF: async (barcode: string) =>
    barcode
      ? {
          name: 'OFF Test Product',
          brand: null,
          quantity: null,
          image: null,
          source: 'openfoodfacts',
        }
      : null,
}));

let mockScannedBarcode = '123456';
const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();

const mockDb: any = {
  products: {
    add: vi.fn(),
    update: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    where: vi.fn(),
    get: vi.fn(),
    filter: vi.fn(),
  },
  pickItems: {
    add: vi.fn(),
    where: vi.fn(),
  },
  pickLists: {
    toArray: vi.fn(),
  },
  categories: {
    toArray: vi.fn(),
    where: vi.fn(),
    add: vi.fn(),
    get: vi.fn(),
  },
  transaction: vi.fn(),
};

vi.mock('../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
  useCategories: () => mockUseCategories(),
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

vi.mock('uuid', () => ({ v4: () => 'new-product-id' }));

vi.mock('../components/BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.(mockScannedBarcode)}>
      Mock Scan
    </button>
  ),
}));

import ManageProductsScreen from './ManageProductsScreen';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const pickItemsStore: any[] = [];

beforeEach(() => {
  mockUseProducts.mockReset();
  mockUseCategories.mockReset();
  mockScannedBarcode = '123456';
  pickItemsStore.length = 0;

  // reset DB mock functions
  Object.keys(mockDb).forEach((k) => {
    const obj = mockDb[k];
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((fn) => {
        if (typeof obj[fn] === 'function') obj[fn].mockReset?.();
      });
    }
  });

  mockDb.products.where.mockImplementation(() => ({
    equals: (value: string) => ({
      first: () => Promise.resolve(mockUseProducts().find((p: any) => p.barcode === value)),
    }),
  }));

  mockDb.pickItems.add.mockImplementation(async (item: any) => {
    pickItemsStore.push(item);
    return item.id;
  });

  mockDb.pickItems.where.mockImplementation((field: string) => ({
    equals: (value: string) => ({
      count: async () => pickItemsStore.filter((it) => it[field] === value).length,
      filter: (pred: (it: any) => boolean) => ({
        first: async () => pickItemsStore.find((it) => it[field] === value && pred(it)),
      }),
      first: async () => pickItemsStore.find((it) => it[field] === value),
    }),
  }));

  mockDb.pickLists.toArray.mockResolvedValue([]);
  mockDb.transaction.mockImplementation(async (_mode: string, ...args: unknown[]) => {
    const callback = args[args.length - 1] as (() => Promise<unknown>) | undefined;
    if (typeof callback === 'function') return callback();
    return undefined;
  });

  mockDb.categories.toArray.mockResolvedValue([]);
  mockDb.categories.where.mockImplementation(() => ({ equals: () => ({ first: async () => undefined }) }));

  mockDb.products.filter.mockImplementation((predicate?: (product: any) => boolean) => ({
    first: async () => {
      const items = mockUseProducts();
      return predicate ? items.find((item: any) => predicate(item)) : undefined;
    },
    delete: vi.fn(),
  }));
});

function findSaveButton() {
  const exact = screen.queryByRole('button', { name: /save product/i }) ?? screen.queryByRole('button', { name: /add product/i });
  if (exact) return exact;
  const allButtons = screen.queryAllByRole('button');
  for (const b of allButtons) {
    const text = (b.textContent || '').trim();
    const aria = b.getAttribute('aria-label') ?? '';
    if (/save/i.test(text) || /add/i.test(text) || /save/i.test(aria) || /add/i.test(aria)) return b;
  }
  return allButtons.length ? allButtons[0] : null;
}

async function openAddProductDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /add product/i }));
}

describe('ManageProductsScreen barcode lookup', () => {
  beforeEach(() => {
    mockUseProducts.mockReturnValue([]);
    mockUseCategories.mockReturnValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);
  });

  it('prefills the product name after scanning a barcode', async () => {
    server.use(
      http.get('https://world.openfoodfacts.org/api/v2/product/123456.json', () =>
        HttpResponse.json({
          status: 1,
          product: {
            product_name: 'OFF Test Product',
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await openAddProductDialog(user);

    await user.click(screen.getByRole('button', { name: /scan barcode/i }));
    await user.click(screen.getByRole('button', { name: /mock scan/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('OFF Test Product');
    });
  });

  it('prevents adding a product with a duplicate barcode', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'prod-1',
        name: 'Existing Product',
        category: 'Snacks',
        barcode: '123456',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
    ]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await openAddProductDialog(user);

    await user.type(screen.getByLabelText(/name/i), 'New Product');
    await user.click(screen.getByRole('button', { name: /scan barcode/i }));
    await user.click(screen.getByRole('button', { name: /mock scan/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: /scan barcode/i }));

    const saveBtn = findSaveButton();
    expect(saveBtn).toBeTruthy();
    await user.click(saveBtn as HTMLElement);

    expect(await screen.findByText(/barcode is already assigned/i)).toBeVisible();
    expect(mockDb.products.add).not.toHaveBeenCalled();
  });

  it('prevents adding a product with a duplicate name (case-insensitive)', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'prod-1',
        name: 'Existing Product',
        category: 'Snacks',
        barcode: undefined,
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
    ]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await openAddProductDialog(user);

    await user.type(screen.getByLabelText(/name/i), 'existing product');

    const saveBtn = findSaveButton();
    expect(saveBtn).toBeTruthy();
    await user.click(saveBtn as HTMLElement);

    expect(await screen.findByText(/product with this name already exists/i)).toBeVisible();
    expect(mockDb.products.add).not.toHaveBeenCalled();
  });

  it('informs the user when barcode lookup happens offline', async () => {
    const originalNavigator = navigator as any;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    try {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ManageProductsScreen />
        </MemoryRouter>,
      );

      await openAddProductDialog(user);

      await user.click(screen.getByRole('button', { name: /scan barcode/i }));
      await user.click(screen.getByRole('button', { name: /mock scan/i }));

      expect(await screen.findByText(/you are offline\. enter details manually\./i)).toBeVisible();
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      } as any);
    }
  });

  it('closes the add product dialog with the close icon and backdrop', async () => {
    mockUseProducts.mockReturnValue([]);
    mockUseCategories.mockReturnValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await openAddProductDialog(user);
    await user.click(screen.getByRole('button', { name: /close add product/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /add product dialog/i })).not.toBeInTheDocument();
    });

    await openAddProductDialog(user);
    // wait for the dialog backdrop to be rendered, then click it
    await waitFor(() => {
      expect(document.querySelector('[role="presentation"]')).toBeTruthy();
    });
    const backdrop = document.querySelector('[role="presentation"]');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /add product dialog/i })).not.toBeInTheDocument();
    });
  });

  it('prevents updating a product to use an existing barcode', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'prod-1',
        name: 'Existing Product',
        category: 'Snacks',
        barcode: '123456',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
      {
        id: 'prod-2',
        name: 'Another Product',
        category: 'Snacks',
        barcode: '654321',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
    ]);

    mockDb.products.get.mockResolvedValueOnce({
      id: 'prod-2',
      name: 'Another Product',
      category: 'cat-1',
      barcode: '654321',
      unit_type: 'unit',
      bulk_name: 'pack',
      archived: false,
    });

    mockDb.products.filter.mockImplementation(() => ({ delete: vi.fn() }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    // open edit control for product labelled "Edit Existing Product"
    await user.click(screen.getByLabelText(/edit existing product/i));

    // there are multiple Barcode inputs on the page (main form + product edit). pick the edit one by value.
    const barcodeInputs = screen.getAllByLabelText(/barcode/i);
    const barcodeField = barcodeInputs.find((i) => (i as HTMLInputElement).value === '123456') ?? barcodeInputs[0];

    fireEvent.change(barcodeField, { target: { value: '654321' } });
    expect(barcodeField).toHaveValue('654321');

    // choose the product-row save icon button (it contains an SVG or has aria-label)
    const saveButtons = screen.getAllByRole('button', { name: /save product/i });
    const productSaveButton = saveButtons.find((b) => b.getAttribute('aria-label') === 'Save product' || b.querySelector('svg') !== null) ?? saveButtons[0];
    expect(productSaveButton).toBeTruthy();
    await user.click(productSaveButton as HTMLElement);

    await waitFor(() => {
      expect(barcodeField).toHaveAccessibleDescription('This barcode is already assigned to another product.');
      expect(barcodeField).toHaveAttribute('aria-invalid', 'true');
    });
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });

  it('prevents updating a product to use an existing name', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'prod-1',
        name: 'Existing Product',
        category: 'Snacks',
        barcode: '123456',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
      {
        id: 'prod-2',
        name: 'Another Product',
        category: 'Snacks',
        barcode: '654321',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
    ]);

    mockDb.products.get.mockResolvedValueOnce({
      id: 'prod-2',
      name: 'Another Product',
      category: 'cat-1',
      barcode: '654321',
      unit_type: 'unit',
      bulk_name: 'pack',
      archived: false,
    });

    mockDb.products.filter.mockImplementation(() => ({ delete: vi.fn() }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/edit another product/i));

    // pick the name input that corresponds to the product row we are editing
    const nameInputs = screen.getAllByLabelText(/name/i);
    const nameField = nameInputs.find((i) => (i as HTMLInputElement).value === 'Another Product') as HTMLInputElement;
    expect(nameField).toBeDefined();

    fireEvent.change(nameField, { target: { value: 'Existing Product' } });

    // pick the product's Save icon button (not the main page Save button)
    const saveButtons = screen.getAllByRole('button', { name: /save product/i });
    const productSaveButton = saveButtons.find((b) => b.getAttribute('aria-label') === 'Save product' || b.querySelector('svg') !== null) ?? saveButtons[0];

    expect(productSaveButton).toBeTruthy();
    await user.click(productSaveButton as HTMLElement);

    await waitFor(() => {
      expect(nameField).toHaveAccessibleDescription('A product with this name already exists.');
      expect(nameField).toHaveAttribute('aria-invalid', 'true');
    });
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });
});

describe('ManageProductsScreen auto-adding products to pick lists', () => {
  it('adds a new product to matching pick lists when auto-add is enabled', async () => {
    mockUseProducts.mockReturnValue([]);
    mockUseCategories.mockReturnValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);
    mockDb.pickLists.toArray.mockResolvedValue([
      {
        id: 'list-1',
        area_id: 'area-1',
        created_at: 0,
        categories: ['Snacks'],
        auto_add_new_products: true,
      },
    ]);

    // ensure the categories DB has a 'Snacks' row
    mockDb.categories.toArray.mockResolvedValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);
    mockDb.categories.where.mockImplementation(() => ({
      equals: (value: string) => ({
        first: async () => ({ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }),
      }),
    }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await openAddProductDialog(user);

    await user.type(screen.getByLabelText(/name/i), 'Granola Bar');
    const saveBtn = findSaveButton();
    expect(saveBtn).toBeTruthy();
    await user.click(saveBtn as HTMLElement);

    await waitFor(() => {
      expect(mockDb.pickItems.add).toHaveBeenCalledTimes(1);
    });

    const addedItem = mockDb.pickItems.add.mock.calls[0][0];
    expect(addedItem.pick_list_id).toBe('list-1');
    expect(addedItem.product_id).toBe('new-product-id');
    expect(addedItem.status).toBe('pending');
  });
});

describe('ManageProductsScreen deletion safeguards', () => {
  it('blocks deletion when pick items reference the product', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'prod-chips',
        name: 'Chips',
        category: 'Snacks',
        unit_type: 'unit',
        bulk_name: 'pack',
        archived: false,
        created_at: 0,
        updated_at: 0,
      },
    ]);
    mockUseCategories.mockReturnValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);
    pickItemsStore.push(
      { id: 'item-1', product_id: 'prod-chips', pick_list_id: 'list-1' },
      { id: 'item-2', product_id: 'prod-chips', pick_list_id: 'list-2' },
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete chips/i }));

    expect(mockDb.products.delete).not.toHaveBeenCalled();
    expect(await screen.findByText(/cannot delete this product while 2 pick item\(s\) reference it/i)).toBeVisible();
  });
});
