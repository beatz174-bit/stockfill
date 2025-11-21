import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageProductsScreen } from './ManageProductsScreen';

let mockScannedBarcode = '123456';
const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();

const mockDb = {
  products: {
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    where: vi.fn(),
  },
};

vi.mock('../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
  useCategories: () => mockUseCategories(),
}));

const productDeleteMock = vi.fn();
const pickItemCountMock = vi.fn();

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

vi.mock('../components/BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.(mockScannedBarcode)}>
      Mock Scan
    </button>
  ),
}));

const server = setupServer();

describe('ManageProductsScreen barcode lookup', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mockUseProducts.mockReturnValue([]);
    mockUseCategories.mockReturnValue([{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }]);
    mockScannedBarcode = '123456';
    Object.values(mockDb.products).forEach((fn) => fn.mockReset());
    mockDb.products.where.mockImplementation(() => ({
      equals: (value: string) => ({
        first: () => Promise.resolve(mockUseProducts().find((product: any) => product.barcode === value)),
      }),
    }));
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

    await user.type(screen.getByLabelText(/name/i), 'New Product');
    await user.click(screen.getByRole('button', { name: /scan barcode/i }));
    await user.click(screen.getByRole('button', { name: /mock scan/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: /scan barcode/i }));
    await user.click(screen.getByRole('button', { name: /save product/i }));

    expect(await screen.findByText(/barcode is already assigned/i)).toBeVisible();
    expect(mockDb.products.add).not.toHaveBeenCalled();
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

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/edit existing product/i));
    const barcodeField = screen.getByLabelText(/barcode/i);
    fireEvent.change(barcodeField, { target: { value: '654321' } });
    expect(barcodeField).toHaveValue('654321');
    await user.click(screen.getByLabelText(/save product/i));

    await waitFor(() => {
      expect(barcodeField).toHaveAccessibleDescription('This barcode is already assigned to another product.');
      expect(barcodeField).toHaveAttribute('aria-invalid', 'true');
    });
    expect(mockDb.products.update).not.toHaveBeenCalled();
  });
});

describe('ManageProductsScreen deletion safeguards', () => {
  it('blocks deletion when pick items reference the product', async () => {
    pickItemCountMock.mockResolvedValueOnce(2);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete chips/i }));

    expect(productDeleteMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/cannot delete this product while 2 pick item\(s\) reference it/i)).toBeVisible();
  });
});

