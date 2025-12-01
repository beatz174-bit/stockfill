// src/components/PickItemRow.narrow.test.tsx
import React from 'react';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';

// mock useMediaQuery and useTheme to force narrow screen
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => true,
  };
});

vi.mock('@mui/material/styles', async () => {
  const actual = await vi.importActual('@mui/material/styles');
  return {
    ...actual,
    useTheme: () => ({
      breakpoints: { down: () => '@media' },
      palette: { primary: { main: '#1976d2' } },
    }),
  };
});

import { PickItemRow } from './PickItemRow';

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
});

describe('PickItemRow narrow screen behavior', () => {
  it('opens controls on click/keyboard, increments/decrements and confirms delete', async () => {
    const onInc = vi.fn();
    const onDec = vi.fn();
    const onToggle = vi.fn();
    const onStatus = vi.fn();
    const onDelete = vi.fn();

    const item = {
      id: 'i1',
      pick_list_id: 'list-1',
      product_id: 'p1',
      quantity: 2,
      is_carton: false,
      status: 'pending' as const,
      created_at: 0,
      updated_at: 0,
    };

    const product = {
      id: 'p1',
      name: 'Orange Juice',
      category: 'Drinks',
      unit_type: 'unit',
      bulk_name: 'carton',
      barcode: '111',
      archived: false,
      created_at: 0,
      updated_at: 0,
    };

    render(
      <PickItemRow
        item={item}
        product={product}
        onIncrementQuantity={onInc}
        onDecrementQuantity={onDec}
        onToggleCarton={onToggle}
        onStatusChange={onStatus}
        onDelete={onDelete}
      />,
    );

    const titleRow = screen.getByTestId('pick-item-title-row');
    await userEvent.click(titleRow);

    expect(await screen.findByText(/Quantity:/i)).toBeVisible();

    const closeButton = screen.getByLabelText(/Close controls/i);
    await userEvent.click(closeButton);

    const openControls = screen.getByLabelText(/Open item controls/i);
    await userEvent.click(openControls);

    const decBtn = await screen.findByLabelText(/Decrease quantity/i);
    const incBtn = await screen.findByLabelText(/Increase quantity/i);
    await userEvent.click(decBtn);
    await userEvent.click(incBtn);

    expect(onDec).toHaveBeenCalled();
    expect(onInc).toHaveBeenCalled();

    const packBtn = screen.getByLabelText(/Switch to unit packaging|Switch to carton packaging/i);
    await userEvent.click(packBtn);
    expect(onToggle).toHaveBeenCalled();

    const checkbox = screen.getByLabelText('Toggle picked status');
    await userEvent.click(checkbox);
    expect(onStatus).toHaveBeenCalledWith('picked');

    const dialogDeleteIcon = screen.getAllByLabelText(/Delete item/i)[0];
    await userEvent.click(dialogDeleteIcon);

    const confirmDialog = await screen.findByRole('dialog', { name: /Delete item/i });
    const confirmDeleteButton = within(confirmDialog).getByRole('button', { name: /delete/i });
    await userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it('opens controls on Enter key when narrow', async () => {
    const onInc = vi.fn();
    const item = {
      id: 'i2',
      pick_list_id: 'list-1',
      product_id: 'p2',
      quantity: 1,
      is_carton: false,
      status: 'pending' as const,
      created_at: 0,
      updated_at: 0,
    };

    const product = {
      id: 'p2',
      name: 'Test Product',
      category: 'Snacks',
      unit_type: 'unit',
      bulk_name: 'carton',
      barcode: undefined,
      archived: false,
      created_at: 0,
      updated_at: 0,
    };

    render(
      <PickItemRow
        item={item}
        product={product}
        onIncrementQuantity={onInc}
        onDecrementQuantity={vi.fn()}
        onToggleCarton={vi.fn()}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // find the title and get the wrapper with role="button"
    const title = screen.getByTestId('pick-item-title-row');
    const wrapper = title.closest('[role="button"]');
    if (!wrapper) throw new Error('Expected wrapper with role="button" not found');

    fireEvent.keyDown(wrapper, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText(/Quantity:/i)).toBeVisible();
  });
});
