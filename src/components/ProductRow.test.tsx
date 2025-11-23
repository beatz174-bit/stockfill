import { render, screen } from '@testing-library/react';
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

describe('ProductRow', () => {
  it('shows name, category, and barcode without unit text in read-only mode', () => {
    render(
      <ProductRow
        product={product}
        categories={categories}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sparkling Water')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
    expect(screen.getByText(/Barcode: 123456/)).toBeInTheDocument();
    expect(screen.queryByText(/bottle/i)).not.toBeInTheDocument();
  });
});
