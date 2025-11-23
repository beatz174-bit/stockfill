import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StartPickListScreen } from './StartPickListScreen';

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

const productsMock = [
  {
    id: 'prod-1',
    name: 'Soda',
    category: 'Drinks',
    unit_type: 'unit',
    bulk_name: 'box',
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
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 'prod-3',
    name: 'Old Soda',
    category: 'Drinks',
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
  });

  it('prefills a new pick list with products from selected categories', async () => {
    const user = userEvent.setup();

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

    await waitFor(() => expect(pickListAddMock).toHaveBeenCalled());
    await waitFor(() => expect(pickItemsBulkAddMock).toHaveBeenCalled());

    const pickItems = pickItemsBulkAddMock.mock.calls[0][0];

    expect(pickItems).toHaveLength(2);
    expect(pickItems.map((item: any) => item.product_id).sort()).toEqual(['prod-1', 'prod-2']);
    pickItems.forEach((item: any) => {
      expect(item.pick_list_id).toBe('generated-id');
      expect(item.is_carton).toBe(false);
      expect(item.quantity).toBe(1);
      expect(item.status).toBe('pending');
    });
  });
});
