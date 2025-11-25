import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductRow } from './ProductRow';
import { Product } from '../models/Product';

const product: Product = {
  id: 'prod-1',
  name: 'Sparkling Water',
  category: 'Drinks',
  unit_type: 'bottle',
  barcode: '123456',
  archived: false,
  created_at: 0,
  updated_at: 0,
};

const categories = ['Drinks', 'Snacks'];

// Provide a categoriesById Map for the new required prop.
// The test product uses category 'Drinks' (a name), so mapping name->name is fine.
// If you had an ID in the product, this map could be id->name.
const categoriesById = new Map<string, string>([
  ['Drinks', 'Drinks'],
  ['Snacks', 'Snacks'],
]);

describe('ProductRow', () => {
  it('shows name, category, and barcode without unit text in read-only mode', () => {
    render(
      <ProductRow
        product={product}
        categories={categories}
        categoriesById={categoriesById}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sparkling Water')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
    expect(screen.getByText(/Barcode: 123456/)).toBeInTheDocument();
    expect(screen.queryByText(/bottle/i)).not.toBeInTheDocument();
  });

  it('saves edits and closes the form', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <ProductRow product={product} categories={categories} categoriesById={categoriesById} onSave={onSave} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByLabelText(/edit sparkling water/i));
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Still Water');
    await user.click(screen.getByLabelText(/category/i));
    await user.selectOptions(screen.getByLabelText(/category/i), 'Snacks');
    await user.click(screen.getByLabelText(/save product/i));

    expect(onSave).toHaveBeenCalledWith('prod-1', {
      name: 'Still Water',
      category: 'Snacks',
      barcode: '123456',
    });
    expect(screen.queryByLabelText(/save product/i)).not.toBeInTheDocument();
  });

  it('surfaces validation errors from duplicate constraints', async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { name: 'DuplicateNameError' }))
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { name: 'DuplicateBarcodeError' }));

    render(<ProductRow product={product} categories={categories} categoriesById={categoriesById} onSave={onSave} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText(/edit sparkling water/i));
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Sparkling Water');
    await user.click(screen.getByLabelText(/save product/i));

    expect(await screen.findByText(/already exists/i)).toBeVisible();

    await user.type(screen.getByLabelText(/barcode/i), '999');
    await user.click(screen.getByLabelText(/save product/i));

    expect(await screen.findByText(/already assigned/i)).toBeVisible();
  });

  it('allows clearing and scanning a new barcode', async () => {
    const user = userEvent.setup();

    render(<ProductRow product={product} categories={categories} categoriesById={categoriesById} onSave={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText(/edit sparkling water/i));
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByRole('button', { name: /scan barcode/i })).toBeVisible();
  });
});
