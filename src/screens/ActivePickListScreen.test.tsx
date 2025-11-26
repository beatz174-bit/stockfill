// src/screens/ActivePickListScreen.test.tsx
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ActivePickListScreen from './ActivePickListScreen';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

const addMock = vi.fn();
const updateMock = vi.fn();
const pickItemsMock = vi.fn<() => PickItem[]>();
const productsMock = vi.fn<() => Product[]>();
const pickListMock = vi.fn();

const defaultProducts: Product[] = [
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
  {
    id: 'prod-3',
    name: 'Apple Juice',
    category: 'Drinks',
    unit_type: 'unit',
    bulk_name: 'box',
    barcode: '333',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
];

vi.mock('../hooks/dataHooks', () => ({
  usePickItems: () => pickItemsMock(),
  useProducts: () => productsMock(),
  usePickList: () => pickListMock(),
  useAreas: () => [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }],
  // keep categories mocked so the screen can resolve category names
  useCategories: () => [
    { id: 'Drinks', name: 'Drinks', created_at: 0, updated_at: 0 },
    { id: 'Snacks', name: 'Snacks', created_at: 0, updated_at: 0 },
  ],
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
  /**
   * Robust product input getter:
   *  - prefer data-testid='product-search-input' if present (recommended),
   *  - otherwise fall back to placeholder 'Search products'.
   */
  const getProductInput = () => {
    const byTestId = screen.queryByTestId('product-search-input');
    if (byTestId) return byTestId;
    return screen.getByPlaceholderText('Search products');
  };

  // helper to get the packaging radio input. Tests were expecting to call .querySelector('input')
  // on a wrapper with data-testid; preserve that behavior but return the actual radio element.
  const getPackagingRadioInput = (testId: 'packaging-filter-all' | 'packaging-filter-units' | 'packaging-filter-cartons') => {
    const wrapper = screen.getByTestId(testId);
    // FormControlLabel renders the input nested — find it
    const input = (wrapper as HTMLElement).querySelector('input');
    if (!input) throw new Error(`Could not find input inside ${testId}`);
    return input;
  };

  // Keep the original getRadio shape for minimal change
  const getRadio = (testId: string) => {
    // try testid wrapper -> radio inside, otherwise find radio by label name
    const maybeWrapper = screen.queryByTestId(testId);
    if (maybeWrapper) {
      return within(maybeWrapper).getByRole('radio');
    }
    // fall back: map packaging ids to labels
    const map: Record<string, string> = {
      'packaging-filter-units': 'Units',
      'packaging-filter-cartons': 'Cartons',
      'packaging-filter-all': 'All',
    };
    const label = map[testId] ?? testId;
    return screen.getByRole('radio', { name: new RegExp(label, 'i') });
  };

  beforeEach(() => {
    addMock.mockReset();
    updateMock.mockReset();
    pickItemsMock.mockReturnValue([]);
    productsMock.mockReturnValue(defaultProducts);
    pickListMock.mockReset();
    pickListMock.mockReturnValue({
      id: 'list-1',
      area_id: 'area-1',
      created_at: 0,
      categories: ['Drinks', 'Snacks'],
      auto_add_new_products: false,
    });
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

    const combobox = getProductInput();
    await user.click(combobox);
    await user.type(combobox, 'cola');

    expect(await screen.findByRole('option', { name: /cola \(drinks\)/i })).toBeVisible();
    expect(screen.queryByRole('option', { name: /chips \(snacks\)/i })).not.toBeInTheDocument();
  });

  it('omits products already on the pick list from search options', async () => {
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

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');

    expect(within(listbox).queryByRole('option', { name: /cola \(drinks\)/i })).not.toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /chips \(snacks\)/i })).toBeVisible();
  });

  it('shows a placeholder when no products are available after filtering', () => {
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
      {
        id: 'item-3',
        pick_list_id: 'list-1',
        product_id: 'prod-3',
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

    expect(screen.getByText(/no available products/i)).toBeVisible();
  });

  it('sorts available products alphabetically, ignoring whitespace and casing', async () => {
    productsMock.mockReturnValue([
      { ...defaultProducts[0], id: 'prod-1', name: '  cola  ' },
      { ...defaultProducts[1], id: 'prod-2', name: 'apple chips' },
      { ...defaultProducts[2], id: 'prod-3', name: 'Banana Bites' },
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    const optionLabels = options.map((option) => option.textContent?.trim());
    expect(optionLabels).toEqual([
      expect.stringMatching(/apple chips/i),
      expect.stringMatching(/banana bites/i),
      expect.stringMatching(/cola/i),
    ]);
  });

  it('sorts pick items alphabetically by product name, ignoring whitespace and casing', () => {
    productsMock.mockReturnValue([
      { ...defaultProducts[0], id: 'prod-1', name: '  cola  ' },
      { ...defaultProducts[1], id: 'prod-2', name: 'apple chips' },
      { ...defaultProducts[2], id: 'prod-3', name: 'Banana Bites' },
    ]);

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
      {
        id: 'item-3',
        pick_list_id: 'list-1',
        product_id: 'prod-3',
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

    const itemRows = screen.getAllByTestId('pick-item-title-row');
    expect(itemRows[0]).toHaveTextContent(/apple chips/i);
    expect(itemRows[1]).toHaveTextContent(/banana bites/i);
    expect(itemRows[2]).toHaveTextContent(/cola/i);
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

    const combobox = getProductInput();
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

  it('sorts the product options alphabetically', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Apple Juice (Drinks)',
      'Chips (Snacks)',
      'Cola (Drinks)',
    ]);
  });

  it('deduplicates product options with the same id', async () => {
    const duplicateProducts = [...defaultProducts, { ...defaultProducts[0] }];
    productsMock.mockReturnValue(duplicateProducts);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options.map((option) => option.textContent)).toEqual([
      'Apple Juice (Drinks)',
      'Chips (Snacks)',
      'Cola (Drinks)',
    ]);
  });

  it('deduplicates product options with the same name', async () => {
    const duplicateNameProducts: Product[] = [
      ...defaultProducts,
      { ...defaultProducts[0], id: 'prod-duplicate', barcode: '999', updated_at: 5 },
    ];

    productsMock.mockReturnValue(duplicateNameProducts);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options.map((option) => option.textContent)).toEqual([
      'Apple Juice (Drinks)',
      'Chips (Snacks)',
      'Cola (Drinks)',
    ]);
  });

  it('limits product options to the pick list categories', async () => {
    pickListMock.mockReturnValue({
      id: 'list-1',
      area_id: 'area-1',
      created_at: 0,
      categories: ['Drinks'],
      auto_add_new_products: false,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options.map((o) => o.textContent)).toEqual(['Apple Juice (Drinks)', 'Cola (Drinks)']);
  });

  it('prevents selecting products that are already on the pick list', async () => {
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

    const combobox = getProductInput();
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');

    // The already-selected product should be visually disabled / omitted; we check omission here.
    expect(within(listbox).queryByRole('option', { name: /cola \(drinks\)/i })).not.toBeInTheDocument();
  });

  it('sorts pick list items by product name and packaging', () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-3', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 1, is_carton: true, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-3', pick_list_id: 'list-1', product_id: 'prod-2', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const rows = screen.getAllByTestId('pick-item-title-row');
    // Expect alphabetical by name (Apple Juice, Chips, Cola) and packaging ordering preserved when names equal
    expect(rows[0]).toHaveTextContent(/apple juice/i);
    expect(rows[1]).toHaveTextContent(/chips/i);
    expect(rows[2]).toHaveTextContent(/cola/i);
  });

  it('hides picked items when show picked is unchecked', async () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 1, is_carton: false, status: 'picked', created_at: 0, updated_at: 0 },
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

    const toggle = screen.getByRole('checkbox', { name: /show picked/i });
    expect(toggle).toBeEnabled();

    // Uncheck show picked and ensure picked row is hidden
    await user.click(toggle);
    expect(screen.queryByText(/cola/i)).not.toBeInTheDocument();
    expect(screen.getByText(/chips/i)).toBeVisible();
  });

  it('disables show picked toggle when all items are picked', () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 1, is_carton: false, status: 'picked', created_at: 0, updated_at: 0 },
    ]);

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const toggle = screen.getByRole('checkbox', { name: /show picked/i });
    expect(toggle).toBeDisabled();
  });

  it('enables packaging filters when both packaging types are visible and filters items', async () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 2, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-2', quantity: 1, is_carton: true, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const unitsRadio = getRadio('packaging-filter-units');
    const cartonsRadio = getRadio('packaging-filter-cartons');

    expect(unitsRadio).toBeEnabled();
    expect(cartonsRadio).toBeEnabled();

    // Select cartons option and ensure units are filtered out
    await user.click(cartonsRadio);
    expect(screen.queryByText(/cola/i)).not.toBeInTheDocument();
  });

  it('disables units and cartons packaging options when only units are visible', () => {
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 2, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-3', quantity: 1, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const unitsRadio = getRadio('packaging-filter-units');
    const cartonsRadio = getRadio('packaging-filter-cartons');

    expect(unitsRadio).toBeDisabled();
    expect(cartonsRadio).toBeDisabled();
  });

  it('resets packaging filter to all and disables options when visible items become single packaging type', async () => {
    // start with both packaging visible
    pickItemsMock.mockReturnValue([
      { id: 'item-1', pick_list_id: 'list-1', product_id: 'prod-1', quantity: 2, is_carton: false, status: 'pending', created_at: 0, updated_at: 0 },
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-2', quantity: 1, is_carton: true, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    const user = userEvent.setup();

    const { rerender } = render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // initial: select cartons so only cartons are visible
    await user.click(getRadio('packaging-filter-cartons'));

    // now update items to only cartons visible
    pickItemsMock.mockReturnValue([
      { id: 'item-2', pick_list_id: 'list-1', product_id: 'prod-2', quantity: 1, is_carton: true, status: 'pending', created_at: 0, updated_at: 0 },
    ]);

    // re-render screen (use rerender to avoid duplicate DOM/testid)
    rerender(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Re-query radios after re-render and assert
    const unitsRadioAfter = getRadio('packaging-filter-units');
    const cartonsRadioAfter = getRadio('packaging-filter-cartons');
    const allRadioInput = (await screen.findByTestId('packaging-filter-all')).querySelector('input');

    expect(unitsRadioAfter).toBeDisabled();
    expect(cartonsRadioAfter).toBeDisabled();
    expect(allRadioInput).toBeChecked();
  });
});
