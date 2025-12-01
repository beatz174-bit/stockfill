import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ManageProductsScreen from '../ManageProductsScreen';
import { createMockDb } from '../../testUtils/mockDb';

const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();
let mockDb = createMockDb();

vi.mock('../../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
  useCategories: () => mockUseCategories(),
}));

vi.mock('../../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

vi.mock('../../components/BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.('dup-barcode')}>
      Mock Scan
    </button>
  ),
}));

const clickSaveButton = async (user: ReturnType<typeof userEvent.setup>) => {
  const saveButton = screen
    .getAllByRole('button')
    .find((btn) => /save product/i.test(btn.textContent || btn.getAttribute('aria-label') || ''));
  if (!saveButton) throw new Error('Save button not found');
  await user.click(saveButton);
};

const selectCategory = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  const categorySelect = screen.getByLabelText(/^category/i);
  await user.click(categorySelect);
  const option = await screen.findByRole('option', { name });
  await user.click(option);
};

beforeEach(() => {
  mockDb = createMockDb();
  mockUseProducts.mockReturnValue([]);
  mockUseCategories.mockReturnValue([
    { id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 },
  ]);
});

describe('ManageProductsScreen add and update flows', () => {
  it('creates category when missing and adds product', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'New Product');
    await selectCategory(user, 'Snacks');
    await user.type(screen.getByLabelText(/barcode/i), '111');
    await clickSaveButton(user);

    await waitFor(() => {
      expect(mockDb.categories.items.find((c) => c.name === 'Snacks')).toBeTruthy();
      expect(mockDb.products.items.find((p) => p.name === 'New Product')).toBeTruthy();
    });
  });

  it('prevents duplicate barcode and shows error', async () => {
    mockUseProducts.mockReturnValue([
      {
        id: 'existing',
        name: 'Existing',
        category: 'c1',
        barcode: 'dup-barcode',
        unit_type: 'unit',
        bulk_name: 'carton',
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

    await user.type(screen.getByLabelText(/name/i), 'Another');
    await selectCategory(user, 'Snacks');
    await user.click(screen.getByText(/scan barcode/i));
    await user.click(screen.getByText(/mock scan/i));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await clickSaveButton(user);

    await waitFor(() => {
      expect(screen.getByTestId('barcode-error')).toBeInTheDocument();
      expect(mockDb.products.items.find((p) => p.name === 'Another')).toBeUndefined();
    });
  });

  it('auto-adds new product to eligible pick lists', async () => {
    const timestamp = Date.now();
    mockDb = createMockDb({
      pickLists: [
        {
          id: 'list-1',
          area_id: 'a',
          created_at: timestamp,
          completed_at: undefined,
          notes: 'List One',
          categories: ['Fresh'],
          auto_add_new_products: true,
        },
        {
          id: 'list-2',
          area_id: 'b',
          created_at: timestamp,
          completed_at: undefined,
          notes: 'List Two',
          categories: ['different'],
          auto_add_new_products: true,
        },
      ],
      categories: [{ id: 'fresh-id', name: 'Fresh', created_at: timestamp, updated_at: timestamp }],
    });
    mockUseProducts.mockReturnValue([]);
    mockUseCategories.mockReturnValue([{ id: 'fresh-id', name: 'Fresh', created_at: timestamp, updated_at: timestamp }]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/name/i), 'Lettuce');
    await selectCategory(user, 'Fresh');
    await clickSaveButton(user);

    await waitFor(() => {
      expect(mockDb.pickItems.items.some((item) => item.pick_list_id === 'list-1')).toBe(true);
      expect(mockDb.pickItems.items.some((item) => item.pick_list_id === 'list-2')).toBe(false);
    });
  });
});
