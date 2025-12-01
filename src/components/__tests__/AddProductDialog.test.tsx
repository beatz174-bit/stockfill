import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddProductDialog } from '../AddProductDialog';
import { createMockDb } from '../../testUtils/mockDb';
import * as offModule from '../../modules/openFoodFacts';
import type { Product } from '../../models/Product';

let mockDb = createMockDb();
const mockUseProducts = vi.fn();
const fetchProductSpy = vi.spyOn(offModule, 'fetchProductFromOFF');
let onlineSpy: ReturnType<typeof vi.spyOn> | undefined;

vi.mock('../../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

vi.mock('../../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
}));

vi.mock('../BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.('scanned-barcode')}>
      Mock Barcode Scan
    </button>
  ),
}));

const defaultCategories = ['Fresh', 'Pantry'];

describe('AddProductDialog', () => {
  beforeEach(() => {
    mockDb = createMockDb();
    mockUseProducts.mockReturnValue([]);
    fetchProductSpy.mockReset();
    fetchProductSpy.mockResolvedValue(null);
    onlineSpy?.mockRestore();
    onlineSpy = vi.spyOn(window.navigator, 'onLine', 'get');
    onlineSpy.mockReturnValue(true);
  });

  it('shows offline alert when barcode lookup attempted offline', async () => {
    onlineSpy?.mockReturnValue(false);

    render(
      <AddProductDialog
        open
        onClose={vi.fn()}
        categoryOptions={defaultCategories}
        initialBarcode="12345"
      />,
    );

    await waitFor(() => expect(screen.getByTestId('barcode-offline')).toBeInTheDocument());
    expect(screen.getByTestId('product-barcode-input')).toHaveValue('12345');
  });

  it('applies initialBarcode and triggers lookup', async () => {
    fetchProductSpy.mockResolvedValue({ name: 'From OFF', source: 'openfoodfacts' });

    render(
      <AddProductDialog
        open
        onClose={vi.fn()}
        categoryOptions={defaultCategories}
        initialBarcode="999"
      />,
    );

    await waitFor(() => expect(fetchProductSpy).toHaveBeenCalledWith('999'));
    expect(screen.getByTestId('product-barcode-input')).toHaveValue('999');
    await waitFor(() => expect(screen.getByLabelText(/name/i)).toHaveValue('From OFF'));
  });

  it('sets helper text for duplicate name and duplicate barcode errors', async () => {
    const existing: Product = {
      id: 'existing',
      name: 'Existing',
      category: 'cat-1',
      unit_type: 'unit',
      bulk_name: 'carton',
      archived: false,
      created_at: 0,
      updated_at: 0,
      barcode: 'dupe',
    };
    mockUseProducts.mockReturnValue([existing]);

    const user = userEvent.setup();
    render(
      <AddProductDialog open onClose={vi.fn()} categoryOptions={defaultCategories} />,
    );

    await user.type(screen.getByLabelText(/name/i), 'Existing');
    await user.type(screen.getByLabelText(/barcode/i), 'unique');
    await user.click(screen.getByRole('button', { name: /save product/i }));

    await waitFor(() => expect(screen.getByText(/a product with this name already exists/i)).toBeInTheDocument());

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Different');
    await user.clear(screen.getByLabelText(/barcode/i));
    await user.type(screen.getByLabelText(/barcode/i), 'dupe');
    await user.click(screen.getByRole('button', { name: /save product/i }));

    await waitFor(() =>
      expect(screen.getByText(/this barcode is already assigned to another product/i)).toBeInTheDocument(),
    );
  });

  it('adds product to eligible pick lists', async () => {
    const timestamp = Date.now();
    mockDb = createMockDb({
      pickLists: [
        {
          id: 'list-1',
          area_id: 'a',
          created_at: timestamp,
          completed_at: undefined,
          notes: 'Auto',
          categories: ['Fresh'],
          auto_add_new_products: true,
        },
        {
          id: 'list-2',
          area_id: 'b',
          created_at: timestamp,
          completed_at: undefined,
          notes: 'Skip',
          categories: ['Pantry'],
          auto_add_new_products: false,
        },
      ],
      categories: [
        { id: 'fresh-id', name: 'Fresh', created_at: timestamp, updated_at: timestamp },
        { id: 'pantry-id', name: 'Pantry', created_at: timestamp, updated_at: timestamp },
      ],
    });
    const user = userEvent.setup();

    render(
      <AddProductDialog open onClose={vi.fn()} categoryOptions={defaultCategories} />,
    );

    await user.type(screen.getByLabelText(/name/i), 'Lettuce');
    await user.click(screen.getByRole('button', { name: /save product/i }));

    await waitFor(() => {
      expect(mockDb.pickItems.items.some((item) => item.pick_list_id === 'list-1')).toBe(true);
      expect(mockDb.pickItems.items.some((item) => item.pick_list_id === 'list-2')).toBe(false);
    });
  });
});
