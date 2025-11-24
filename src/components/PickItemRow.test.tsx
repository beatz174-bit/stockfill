import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PickItemRow } from './PickItemRow';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

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
  beforeEach(() => {
    mockMatchMedia(false);
  });

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
    const quantityLabel = screen.getByText('Qty: 1 unit');
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

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not open the controls dialog when toggling status on narrow screens', async () => {
    mockMatchMedia(true);
    const onStatusChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PickItemRow
        item={baseItem}
        product={baseProduct}
        onIncrementQuantity={vi.fn()}
        onDecrementQuantity={vi.fn()}
        onToggleCarton={vi.fn()}
        onStatusChange={onStatusChange}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /toggle picked status/i }));

    expect(onStatusChange).toHaveBeenCalledWith('picked');
    expect(screen.queryByRole('dialog', { name: baseProduct.name })).not.toBeInTheDocument();
  });

  it('opens the controls dialog from the overflow button on narrow screens', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();

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

    await user.click(screen.getByRole('button', { name: /open item controls/i }));

    expect(screen.getByRole('dialog', { name: baseProduct.name })).toBeVisible();
  });

  it('uses inline controls on wide screens', async () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    const onToggleCarton = vi.fn();
    const user = userEvent.setup();

    render(
      <PickItemRow
        item={baseItem}
        product={baseProduct}
        onIncrementQuantity={onIncrement}
        onDecrementQuantity={onDecrement}
        onToggleCarton={onToggleCarton}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /switch to carton packaging/i }));
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(onToggleCarton).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it('opens controls from keyboard interaction on narrow screens', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();

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

    const row = screen.getByRole('button', { name: /test product/i });
    row.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog', { name: baseProduct.name })).toBeVisible();
  });
});
