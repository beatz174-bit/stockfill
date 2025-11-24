import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ActivePickListScreen } from './ActivePickListScreen';
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
  const getRadio = (testId: string) => within(screen.getByTestId(testId)).getByRole('radio');

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

    const combobox = screen.getByRole('combobox');
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

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');

    expect(
      within(listbox).queryByRole('option', { name: /cola \(drinks\)/i }),
    ).not.toBeInTheDocument();
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

    const combobox = screen.getByRole('combobox');
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

  it('sorts the product options alphabetically', async () => {
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

    const combobox = screen.getByRole('combobox');
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

    const combobox = screen.getByRole('combobox');
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

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Apple Juice (Drinks)',
      'Cola (Drinks)',
    ]);
    expect(screen.queryByRole('option', { name: /chips \(snacks\)/i })).not.toBeInTheDocument();
  });

  it('prevents selecting products that are already on the pick list', async () => {
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
    await user.type(combobox, 'cola');

    expect(screen.queryByRole('option', { name: /cola \(drinks\)/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/no available products/i)).not.toHaveLength(0);
    expect(updateMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });

  it('sorts pick list items by product name and packaging', () => {
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
      {
        id: 'item-2',
        pick_list_id: 'list-1',
        product_id: 'prod-3',
        quantity: 1,
        is_carton: true,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
      {
        id: 'item-3',
        pick_list_id: 'list-1',
        product_id: 'prod-2',
        quantity: 1,
        is_carton: false,
        status: 'pending',
        created_at: 0,
        updated_at: 0,
      },
      {
        id: 'item-4',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
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

    const itemLabels = screen
      .getAllByText(/Apple Juice|Chips|Cola/)
      .map((element) => element.textContent);

    expect(itemLabels).toEqual(['Apple Juice', 'Chips', 'Cola', 'Cola']);
  });

  it('hides picked items when show picked is unchecked', async () => {
    pickItemsMock.mockReturnValue([
      {
        id: 'item-1',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 1,
        is_carton: false,
        status: 'picked',
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
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Cola')).toBeVisible();
    expect(screen.getByText('Chips')).toBeVisible();

    const togglePicked = screen.getByLabelText(/show picked/i);
    await user.click(togglePicked);

    expect(screen.queryByText('Cola')).not.toBeInTheDocument();
    expect(screen.getByText('Chips')).toBeVisible();

    await user.click(togglePicked);
    expect(screen.getByText('Cola')).toBeVisible();
  });

  it('disables show picked toggle when all items are picked', async () => {
    pickItemsMock.mockReturnValue([
      {
        id: 'item-1',
        pick_list_id: 'list-1',
        product_id: 'prod-1',
        quantity: 1,
        is_carton: false,
        status: 'picked',
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

    const togglePicked = screen.getByLabelText(/show picked/i);
    expect(togglePicked).toBeDisabled();
    expect(togglePicked).toBeChecked();
  });

  it('enables packaging filters when both packaging types are visible and filters items', async () => {
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
        is_carton: true,
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

    const allRadio = getRadio('packaging-all');
    const unitsRadio = getRadio('packaging-units');
    const cartonsRadio = getRadio('packaging-cartons');

    expect(allRadio).toBeChecked();
    expect(unitsRadio).not.toBeDisabled();
    expect(cartonsRadio).not.toBeDisabled();

    await user.click(unitsRadio);
    expect(unitsRadio).toBeChecked();
    expect(screen.getByText('Cola')).toBeVisible();
    expect(screen.queryByText('Chips')).not.toBeInTheDocument();

    await user.click(cartonsRadio);
    expect(cartonsRadio).toBeChecked();
    expect(screen.getByText('Chips')).toBeVisible();
    expect(screen.queryByText('Cola')).not.toBeInTheDocument();
  });

  it('disables units and cartons packaging options when only units are visible', () => {
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

    render(
      <MemoryRouter initialEntries={['/pick-lists/1']}>
        <Routes>
          <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getRadio('packaging-all')).toBeChecked();
    expect(getRadio('packaging-units')).toBeDisabled();
    expect(getRadio('packaging-cartons')).toBeDisabled();
  });

  it('resets packaging filter to all and disables options when visible items become single packaging type', async () => {
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
        is_carton: true,
        status: 'picked',
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

    const cartonsRadio = getRadio('packaging-cartons');

    expect(cartonsRadio).not.toBeDisabled();

    await user.click(cartonsRadio);
    expect(cartonsRadio).toBeChecked();
    expect(screen.getByText('Chips')).toBeVisible();
    expect(screen.queryByText('Cola')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/show picked/i));

    expect(getRadio('packaging-all')).toBeChecked();
    expect(getRadio('packaging-units')).toBeDisabled();
    expect(getRadio('packaging-cartons')).toBeDisabled();
    expect(screen.getByText('Cola')).toBeVisible();
    expect(screen.queryByText('Chips')).not.toBeInTheDocument();
  });
});
