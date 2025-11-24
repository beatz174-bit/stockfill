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
});
