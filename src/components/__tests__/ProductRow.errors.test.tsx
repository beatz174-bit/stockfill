import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductRow } from '../ProductRow';
import type { Product } from '../../models/Product';
import { makeNamedError } from '../../test/makeNamedError';

vi.mock('../BarcodeScannerView', () => ({
  BarcodeScannerView: ({ onDetected }: { onDetected?: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected?.('scanned-code')}>
      Mock Scan
    </button>
  ),
}));

const categories = ['Snacks', 'Drinks'];
const categoriesById = new Map([
  ['cat-1', 'Snacks'],
  ['cat-2', 'Drinks'],
]);

const baseProduct: Product = {
  id: 'p1',
  name: 'Product One',
  category: 'cat-1',
  unit_type: 'unit',
  bulk_name: 'carton',
  barcode: undefined,
  archived: false,
  created_at: 0,
  updated_at: 0,
};

describe('ProductRow error handling', () => {
  let onSave: ReturnType<
    typeof vi.fn<(productId: string, updates: { name: string; category: string; barcode?: string }) => void>
  >;
  let onDelete: ReturnType<typeof vi.fn<(productId: string) => void>>;

  beforeEach(() => {
    onSave = vi.fn();
    onDelete = vi.fn();
  });

  const renderRow = (productOverrides: Partial<typeof baseProduct> = {}) =>
    render(
      <ProductRow
        product={{ ...baseProduct, ...productOverrides }}
        categories={categories}
        categoriesById={categoriesById}
        onSave={onSave}
        onDelete={onDelete}
      />,
    );

  it('shows helper text when onSave throws DuplicateNameError', async () => {
    const user = userEvent.setup();
    onSave.mockRejectedValue(makeNamedError('DuplicateNameError'));

    renderRow();
    await user.click(screen.getByLabelText(/edit product one/i));
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Updated');
    await user.click(screen.getByLabelText(/save product/i));

    await waitFor(() => {
      expect(screen.getByText('A product with this name already exists.')).toBeInTheDocument();
    });
  });

  it('shows barcode helper text when onSave throws DuplicateBarcodeError', async () => {
    const user = userEvent.setup();
    onSave.mockRejectedValue(makeNamedError('DuplicateBarcodeError'));

    renderRow({ barcode: '123' });
    await user.click(screen.getByLabelText(/edit product one/i));
    await user.type(screen.getByLabelText(/barcode/i), '456');
    await user.click(screen.getByLabelText(/save product/i));

    await waitFor(() => {
      expect(screen.getByText('This barcode is already assigned to another product.')).toBeInTheDocument();
    });
  });

  it('clears barcode input and toggles scanner dialog visibility', async () => {
    const user = userEvent.setup();

    renderRow({ barcode: 'abc-123' });
    await user.click(screen.getByLabelText(/edit product one/i));

    const barcodeField = screen.getByLabelText(/barcode/i);
    expect(barcodeField).toHaveValue('abc-123');

    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(barcodeField).toHaveValue('');
    expect(screen.queryByText(/barcode/i, { selector: '.MuiFormHelperText-root' })).not.toBeInTheDocument();

    // When barcode is empty, scanner button is shown and opens dialog
    await user.click(screen.getByLabelText(/cancel edit/i));
    await user.click(screen.getByLabelText(/edit product one/i));
    await waitFor(() => expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /scan/i }));
    expect(screen.getByRole('dialog', { name: /scan barcode/i })).toBeInTheDocument();
    await user.click(screen.getByText(/mock scan/i));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /scan barcode/i })).not.toBeInTheDocument());
  });
});
