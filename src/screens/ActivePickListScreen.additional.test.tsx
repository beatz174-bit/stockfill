// src/screens/ActivePickListScreen.additional.test.tsx
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ActivePickListScreen from './ActivePickListScreen';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

const addMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const pickItemsMock = vi.fn<() => PickItem[]>();
const productsMock = vi.fn<() => Product[]>();
const pickListMock = vi.fn();

// allow tests to mutate categories returned by the mocked hook
let categoriesVar: Category[] = [{ id: 'cat-1', name: 'Drinks', created_at: 0, updated_at: 0 }];

vi.mock('../hooks/dataHooks', () => ({
  usePickItems: () => pickItemsMock(),
  useProducts: () => productsMock(),
  usePickList: () => pickListMock(),
  useAreas: () => [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }],
  useCategories: () => categoriesVar,
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      add: addMock,
      update: updateMock,
      get: vi.fn(async (id: string) => {
        const items: PickItem[] = pickItemsMock() ?? [];
        return items.find((it) => it.id === id);
      }),
      delete: deleteMock,
      where: () => ({
        equals: (val: any) => ({
          toArray: async () => {
            const items: PickItem[] = pickItemsMock() ?? [];
            return items.filter((it) => it.pick_list_id === val);
          },
          count: async () => {
            const items: PickItem[] = pickItemsMock() ?? [];
            return items.filter((it) => it.pick_list_id === val).length;
          },
        }),
      }),
    },
  }),
}));

const defaultProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Cola',
    category: 'cat-1',
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
    category: 'cat-1',
    unit_type: 'unit',
    bulk_name: 'box',
    barcode: '222',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
];

beforeEach(() => {
  addMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  pickItemsMock.mockReset();
  productsMock.mockReset();
  pickListMock.mockReset();
  categoriesVar = [{ id: 'cat-1', name: 'Drinks', created_at: 0, updated_at: 0 }];

  productsMock.mockReturnValue(defaultProducts);
  pickListMock.mockReturnValue({
    id: 'list-1',
    area_id: 'area-1',
    created_at: 0,
    categories: ['cat-1'],
    auto_add_new_products: false,
  });
});

describe('ActivePickListScreen - additional branches', () => {
  it('increments / decrements / toggles carton / toggles status / deletes an item', async () => {
    pickItemsMock.mockReturnValue([
      {
        id: 'item-1',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 1,
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

    const inc = screen.getByLabelText('Increase quantity');
    await user.click(inc);
    expect(updateMock).toHaveBeenCalled();

    const dec = screen.getByLabelText('Decrease quantity');
    await user.click(dec);
    expect(updateMock).toHaveBeenCalled();

    const cartonButton = screen.getByLabelText(/Switch to carton packaging/i);
    await user.click(cartonButton);
    expect(updateMock).toHaveBeenCalled();

    const checkbox = screen.getByLabelText('Toggle picked status') as HTMLInputElement;
    await user.click(checkbox);
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });

    const deleteBtn = screen.getByLabelText('Delete item');
    await user.click(deleteBtn);
    const confirmDelete = await screen.findByRole('button', { name: /delete/i });
    await user.click(confirmDelete);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it('handleMarkAllPicked updates items when items exist', async () => {
    // normal case: itemState present -> mark all picked should update
    pickItemsMock.mockReturnValue([
      {
        id: 'item-2',
        pick_list_id: 'list-1',
        product_id: 'prod-2',
        quantity: 1,
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

    const pickCompleteBtn = screen.getByRole('button', { name: /pick complete/i });
    await user.click(pickCompleteBtn);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
  });

  it('packaging radios are disabled when unique packaging count === 1 and enabled when both present', async () => {
    // single packaging type (all units)
    pickItemsMock.mockReturnValue([
      {
        id: 'item-3',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 1,
        is_carton: false,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const unitsWrapper = screen.getByTestId('packaging-filter-units');
    const cartonsWrapper = screen.getByTestId('packaging-filter-cartons');
    const unitsInput = (unitsWrapper as HTMLElement).querySelector('input') as HTMLInputElement;
    const cartonsInput = (cartonsWrapper as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(unitsInput.disabled).toBe(true);
    expect(cartonsInput.disabled).toBe(true);

    // cleanup before re-rendering to avoid duplicate data-testid nodes
    cleanup();

    // both cartons and units present -> radios enabled
    pickItemsMock.mockReturnValue([
      {
        id: 'item-4',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 1,
        is_carton: false,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
      {
        id: 'item-5',
        pick_list_id: 'list-1',
        product_id: 'prod-2',
        quantity: 1,
        is_carton: true,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const unitsWrapper2 = screen.getByTestId('packaging-filter-units');
    const cartonsWrapper2 = screen.getByTestId('packaging-filter-cartons');
    const unitsInput2 = (unitsWrapper2 as HTMLElement).querySelector('input') as HTMLInputElement;
    const cartonsInput2 = (cartonsWrapper2 as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(unitsInput2.disabled).toBe(false);
    expect(cartonsInput2.disabled).toBe(false);
  });

  it('categoryOptions resolves legacy names to ids when pickList.categories contains names', () => {
    // Set categoriesVar so useCategories returns an id `c1` for 'Drinks'
    categoriesVar = [{ id: 'c1', name: 'Drinks', created_at: 0, updated_at: 0 }];

    // pickList with legacy name 'Drinks'
    pickListMock.mockReturnValue({
      id: 'list-1',
      area_id: 'area-1',
      created_at: 0,
      categories: ['Drinks'],
      auto_add_new_products: false,
    });

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const select = screen.getByLabelText(/Filter by category/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.value === 'c1');
    expect(option).toBeDefined();
    expect(option?.text).toMatch(/Drinks/i);
  });
});
