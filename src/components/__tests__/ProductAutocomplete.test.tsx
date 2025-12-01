import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductAutocomplete } from '../ProductAutocomplete';
import { Product } from '../../models/Product';

const mockUseCategories = vi.fn();

vi.mock('../../hooks/dataHooks', () => ({
  useCategories: () => mockUseCategories(),
}));

const products: Product[] = [
  {
    id: 'p1',
    name: 'Apple',
    category: 'cat-1',
    unit_type: 'unit',
    bulk_name: 'carton',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 'p2',
    name: 'Banana',
    category: 'cat-2',
    unit_type: 'unit',
    bulk_name: 'carton',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
];

describe('ProductAutocomplete', () => {
  beforeEach(() => {
    mockUseCategories.mockReturnValue([
      { id: 'cat-1', name: 'Fruit', created_at: 0, updated_at: 0 },
      { id: 'cat-2', name: 'Pantry', created_at: 0, updated_at: 0 },
    ]);
  });

  it('calls onQueryChange on input change', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(
      <ProductAutocomplete
        availableProducts={products}
        onSelect={vi.fn()}
        onQueryChange={onQueryChange}
      />,
    );

    const input = screen.getByTestId('product-search-input');
    await user.type(input, 'App');

    expect(onQueryChange).toHaveBeenCalledWith('App');
    expect((input as HTMLInputElement).value).toBe('App');
  });

  it('clears query on clear reason and calls onQueryChange with empty string', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(
      <ProductAutocomplete
        availableProducts={products}
        onSelect={vi.fn()}
        onQueryChange={onQueryChange}
      />,
    );

    const input = screen.getByTestId('product-search-input');
    await user.type(input, 'Ban');
    const clearButton = await screen.findByLabelText('Clear');
    await user.click(clearButton);

    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('');
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  it('calls onSelect and clears selection when product chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ProductAutocomplete availableProducts={products} onSelect={onSelect} onQueryChange={vi.fn()} />,
    );

    const input = screen.getByTestId('product-search-input');
    await user.click(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(products[0]));
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('disables add button when handler missing', () => {
    render(<ProductAutocomplete availableProducts={products} onSelect={vi.fn()} />);
    const addButton = screen.getByLabelText(/add product/i);
    expect(addButton).toBeDisabled();

    render(
      <ProductAutocomplete availableProducts={products} onSelect={vi.fn()} onAddProduct={vi.fn()} />, {
        container: document.body.appendChild(document.createElement('div')),
      },
    );
    expect(screen.getAllByLabelText(/add product/i).at(-1)).not.toBeDisabled();
  });
});
