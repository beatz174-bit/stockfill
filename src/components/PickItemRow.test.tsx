import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PickItemRow } from './PickItemRow';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

const baseItem: PickItem = {
  id: 'item-1',
  pick_list_id: 'list-1',
  product_id: 'prod-1',
  quantity: 1,
  is_carton: false,
  status: 'pending',
  created_at: 0,
  updated_at: 0,
};

const baseProduct: Product = {
  id: 'prod-1',
  name: 'Test Product',
  barcode: '123',
  category: 'Category',
  unit_type: 'unit',
  bulk_name: 'box',
  archived: false,
  created_at: 0,
  updated_at: 0,
};

describe('PickItemRow', () => {
  it('keeps quantity inline with matching typography to the product name', () => {
    render(
      <PickItemRow
        item={baseItem}
        product={baseProduct}
        onIncrementQuantity={vi.fn()}
        onDecrementQuantity={vi.fn()}
        onToggleCarton={vi.fn()}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const productName = screen.getByText(baseProduct.name);
    const quantityLabel = screen.getByText('1 unit');
    const titleRow = screen.getByTestId('pick-item-title-row');

    const rowStyle = getComputedStyle(titleRow);
    expect(rowStyle.display).toBe('flex');
    expect(rowStyle.flexDirection).toBe('row');

    const productStyle = getComputedStyle(productName);
    const quantityStyle = getComputedStyle(quantityLabel);

    expect(productStyle.fontSize).toBe(quantityStyle.fontSize);
    expect(productStyle.fontWeight).toBe(quantityStyle.fontWeight);
  });

  it('asks for confirmation before deleting a product from the pick list', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <PickItemRow
        item={baseItem}
        product={baseProduct}
        onIncrementQuantity={vi.fn()}
        onDecrementQuantity={vi.fn()}
        onToggleCarton={vi.fn()}
        onStatusChange={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete item/i }));

    expect(
      screen.getByRole('dialog', { name: /delete item/i }),
    ).toBeVisible();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm delete/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
