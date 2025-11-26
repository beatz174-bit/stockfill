// src/screens/StartPickListScreen.test.tsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StartPickListScreen from './StartPickListScreen';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const areasMock = [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }];
const categoriesMock = [
  { id: 'cat-1', name: 'Drinks', created_at: 0, updated_at: 0 },
  { id: 'cat-2', name: 'Snacks', created_at: 0, updated_at: 0 },
];

// NOTE: product.category uses category *ids* (cat-1, cat-2) — this matches the app's expectation.
const productsMock = [
  {
    id: 'prod-1',
    name: 'Soda',
    category: 'cat-1',
    unit_type: 'unit',
    bulk_name: 'box',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 'prod-2',
    name: 'Chips',
    category: 'cat-2',
    unit_type: 'unit',
    bulk_name: 'box',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 'prod-3',
    name: 'Old Soda',
    category: 'cat-1',
    unit_type: 'unit',
    bulk_name: 'box',
    archived: true,
    created_at: 0,
    updated_at: 0,
  },
];

const pickListAddMock = vi.fn();
const pickItemsBulkAddMock = vi.fn();
const transactionMock = vi.fn();
const productsToArrayMock = vi.fn();

vi.mock('../hooks/dataHooks', () => ({
  useAreas: () => areasMock,
  useCategories: () => categoriesMock,
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickLists: { add: pickListAddMock },
    pickItems: { bulkAdd: pickItemsBulkAddMock },
    products: { toArray: productsToArrayMock },
    transaction: transactionMock,
  }),
}));

vi.mock('uuid', () => ({
  v4: () => 'generated-id',
}));

beforeEach(() => {
  navigateMock.mockReset();
  pickListAddMock.mockReset();
  pickItemsBulkAddMock.mockReset();
  transactionMock.mockReset();
  productsToArrayMock.mockReset();

  productsToArrayMock.mockResolvedValue(productsMock);
  transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
    const callback = args[args.length - 1] as () => Promise<void>;
    // call the transaction callback to simulate Dexie transaction
    await callback();
  });
});

describe('StartPickListScreen', () => {
  it('shows category selection controls', () => {
    render(
      <MemoryRouter>
        <StartPickListScreen />
      </MemoryRouter>,
    );

    categoriesMock.forEach((category) => {
      expect(screen.getByRole('checkbox', { name: category.name })).toBeInTheDocument();
    });

    expect(screen.getByRole('checkbox', { name: /add new products/i })).toBeChecked();
  });

  it('prefills a new pick list with products from selected categories', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <StartPickListScreen />
      </MemoryRouter>,
    );

    // choose area
    await user.click(screen.getByLabelText(/area/i));
    await user.click(screen.getByRole('option', { name: /front counter/i }));

    // toggle categories (checkbox labels are names, toggling uses IDs internally)
    await user.click(screen.getByRole('checkbox', { name: /drinks/i }));
    await user.click(screen.getByRole('checkbox', { name: /snacks/i }));

    // save pick list
    await user.click(screen.getByRole('button', { name: /save pick list/i }));

    // ensure pick list and pick items are created
    await waitFor(() => expect(pickListAddMock).toHaveBeenCalled());
    await waitFor(() => expect(pickItemsBulkAddMock).toHaveBeenCalled());

    const pickItems = pickItemsBulkAddMock.mock.calls[0][0];

    // only non-archived products are included and exactly one of each name
    expect(pickItems).toHaveLength(2);
    expect(pickItems.map((item: any) => item.product_id).sort()).toEqual(['prod-1', 'prod-2']);
    pickItems.forEach((item: any) => {
      expect(item.pick_list_id).toBe('generated-id');
      expect(item.is_carton).toBe(false);
      expect(item.quantity).toBe(1);
      expect(item.status).toBe('pending');
    });

    const pickListRecord = pickListAddMock.mock.calls[0][0];

    // The app stores category ids on the pick list (not names) — tests should expect ids
    expect(pickListRecord.categories).toEqual(['cat-1', 'cat-2']);
    expect(pickListRecord.auto_add_new_products).toBe(true);
  });

  it('deduplicates products when selected categories include overlaps', async () => {
    const user = userEvent.setup();

    // include duplicates (same names / categories). Use category ids for duplicates as well.
    productsToArrayMock.mockResolvedValue([
      ...productsMock,
      { ...productsMock[0] }, // exact same (same id/name)
      { ...productsMock[1], id: 'prod-2-duplicate' }, // same name different id
    ]);

    render(
      <MemoryRouter>
        <StartPickListScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/area/i));
    await user.click(screen.getByRole('option', { name: /front counter/i }));

    await user.click(screen.getByRole('checkbox', { name: /drinks/i }));
    await user.click(screen.getByRole('checkbox', { name: /snacks/i }));

    await user.click(screen.getByRole('button', { name: /save pick list/i }));

    await waitFor(() => expect(pickItemsBulkAddMock).toHaveBeenCalled());

    const pickItems = pickItemsBulkAddMock.mock.calls[0][0];
    const uniqueProductIds = new Set(pickItems.map((item: any) => item.product_id));

    expect(pickItems).toHaveLength(2);
    expect(uniqueProductIds.size).toBe(2);
    expect(uniqueProductIds).toEqual(new Set(['prod-1', 'prod-2']));
  });
});
