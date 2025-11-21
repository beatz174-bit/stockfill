import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ManageProductsScreen } from './ManageProductsScreen';

const productsMock = [{ id: 'prod-1', name: 'Chips', category: 'Snacks', archived: false, created_at: 0, updated_at: 0 }];
const categoriesMock = [{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }];

vi.mock('../hooks/dataHooks', () => ({
  useProducts: () => productsMock,
  useCategories: () => categoriesMock,
}));

const productDeleteMock = vi.fn();
const pickItemCountMock = vi.fn();

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    products: {
      add: vi.fn(),
      update: vi.fn(),
      delete: productDeleteMock,
    },
    pickItems: {
      where: () => ({
        equals: () => ({
          count: pickItemCountMock,
        }),
      }),
    },
  }),
}));

vi.mock('../components/BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.('123456')}>
      Mock Scan
    </button>
  ),
}));

const server = setupServer();

describe('ManageProductsScreen barcode lookup', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

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

