// src/screens/ActivePickListScreen.more.test.tsx
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ActivePickListScreen from './ActivePickListScreen';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

const addMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const pickItemsMock = vi.fn<() => PickItem[]>();
const productsMock = vi.fn<() => Product[]>();
const pickListMock = vi.fn();

vi.mock('../hooks/dataHooks', () => ({
  usePickItems: () => pickItemsMock(),
  useProducts: () => productsMock(),
  usePickList: () => pickListMock(),
  useAreas: () => [{ id: 'a1', name: 'Front', created_at: 0, updated_at: 0 }],
  useCategories: () => [{ id: 'c1', name: 'Drinks', created_at: 0, updated_at: 0 }],
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      add: addMock,
      update: updateMock,
      get: vi.fn(async (id: string) => (pickItemsMock() || []).find((it) => it.id === id)),
      delete: deleteMock,
      where: () => ({
        equals: (val: any) => ({
          toArray: async () => (pickItemsMock() || []).filter((it) => it.pick_list_id === val),
          count: async () => (pickItemsMock() || []).filter((it) => it.pick_list_id === val).length,
        }),
      }),
    },
  }),
}));

const products = [
  { id: 'prod-1', name: 'Cola', category: 'c1', unit_type: 'unit', bulk_name: 'box', barcode: '111', archived: false, created_at: 0, updated_at: 0 },
];

beforeEach(() => {
  addMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  pickItemsMock.mockReset();
  productsMock.mockReset();
  pickListMock.mockReset();

  productsMock.mockReturnValue(products);
  pickListMock.mockReturnValue({ id: 'list-1', area_id: 'a1', created_at: 0, categories: ['c1'], auto_add_new_products: false });
});

describe('ActivePickListScreen extra branches', () => {
  it('adds a pick item when a product is selected (listbox opens)', async () => {
    // Ensure the product is available (not already on the pick list)
    pickItemsMock.mockReturnValue([]);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Get the combobox (product input), open it and select the option
    const combobox = screen.getByRole('combobox', { name: /search products/i }) || screen.getByTestId('product-search-input');
    await user.click(combobox);

    // Wait for the listbox to appear and click the option
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /cola/i }));

    // Assert add was called
    await waitFor(() => {
      expect(addMock).toHaveBeenCalled();
      const added = addMock.mock.calls[0][0];
      expect(added).toEqual(expect.objectContaining({ product_id: 'prod-1', quantity: 1, is_carton: false }));
    });
  });

  it('shows "No items match the filter" when visible items exist but none match search', async () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const listSearch = screen.getByPlaceholderText(/search list/i) || screen.getByRole('textbox', { name: /search list/i });
    await user.type(listSearch, 'nomatchtext');

    expect(await screen.findByText(/no items match the filter/i)).toBeVisible();
  });

  it('categoryFilter restricts visible items to selected category', async () => {
    productsMock.mockReturnValue([
      ...products,
      { id: 'prod-2', name: 'Chips', category: 'other', unit_type: 'unit', bulk_name: 'box', created_at: 0, updated_at: 0, archived: false },
    ]);
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-2', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const select = screen.getByLabelText(/filter by category/i) as HTMLSelectElement;
    await user.selectOptions(select, ['c1']);

    expect(screen.getByText(/cola/i)).toBeVisible();
    expect(screen.queryByText(/chips/i)).not.toBeInTheDocument();
  });
});
