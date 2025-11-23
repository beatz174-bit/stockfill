import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ActivePickListScreen } from './ActivePickListScreen';
import { PickItem } from '../models/PickItem';

const addMock = vi.fn();
const updateMock = vi.fn();
const pickItemsMock = vi.fn<PickItem[], []>();

vi.mock('../hooks/dataHooks', () => ({
  usePickItems: () => pickItemsMock(),
  useProducts: () => [
    {
      id: 'prod-1',
      name: 'Cola',
      category: 'Drinks',
      unit_type: 'unit',
      bulk_name: 'box',
      barcode: '111',
      archived: false,
      created_at: 0,
      updated_at: 0,
    },
    {
      id: 'prod-2',
      name: 'Chips',
      category: 'Snacks',
      unit_type: 'unit',
      bulk_name: 'box',
      barcode: '222',
      archived: false,
      created_at: 0,
      updated_at: 0,
    },
  ],
  usePickList: () => ({ id: 'list-1', area_id: 'area-1', created_at: 0 }),
  useAreas: () => [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }],
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      add: addMock,
      update: updateMock,
      get: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

describe('ActivePickListScreen product search', () => {
  beforeEach(() => {
    addMock.mockReset();
    updateMock.mockReset();
    pickItemsMock.mockReturnValue([]);
  });

  it('filters the product list based on the search query', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'cola');

    expect(await screen.findByRole('option', { name: /cola \(drinks\)/i })).toBeVisible();
    expect(screen.queryByRole('option', { name: /chips \(snacks\)/i })).not.toBeInTheDocument();
  });

  it('adds a pick item when a product is selected', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /cola \(drinks\)/i }));

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0][0]).toMatchObject({
      product_id: 'prod-1',
      quantity: 1,
      is_carton: false,
    });
  });

  it('updates an existing pick item when the same packaging is selected', async () => {
    pickItemsMock.mockReturnValue([
      {
        id: 'item-1',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 2,
        is_carton: false,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /cola \(drinks\)/i }));

    expect(updateMock).toHaveBeenCalledWith('item-1', expect.objectContaining({ quantity: 3 }));
    expect(addMock).not.toHaveBeenCalled();
  });
});
