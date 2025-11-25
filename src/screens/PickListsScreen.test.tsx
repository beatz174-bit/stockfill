import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PickListsScreen from './PickListsScreen';

let areasMock = [
  { id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 },
  { id: 'area-2', name: 'back room', created_at: 0, updated_at: 0 },
  { id: 'area-3', name: 'Cafe', created_at: 0, updated_at: 0 },
];

let pickListsMock = [
  { id: 'list-2', area_id: 'area-2', created_at: 3, categories: [], auto_add_new_products: false },
  { id: 'list-3', area_id: 'area-3', created_at: 4, categories: [], auto_add_new_products: false },
  { id: 'list-1', area_id: 'area-1', created_at: 5, categories: [], auto_add_new_products: false },
];

const pickListDeleteMock = vi.fn();
const pickListUpdateMock = vi.fn();
const pickItemDeleteMock = vi.fn();

vi.mock('../hooks/dataHooks', () => ({
  usePickLists: () => pickListsMock,
  useAreas: () => areasMock,
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      where: () => ({
        equals: () => ({ delete: pickItemDeleteMock }),
      }),
    },
    pickLists: {
      update: pickListUpdateMock,
      delete: pickListDeleteMock,
      where: () => ({
        equals: () => ({ delete: vi.fn() }),
      }),
    },
  }),
}));

describe('PickListsScreen sorting', () => {
  beforeEach(() => {
    pickListDeleteMock.mockReset();
    pickListUpdateMock.mockReset();
    pickItemDeleteMock.mockReset();
    areasMock = [
      { id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 },
      { id: 'area-2', name: 'back room', created_at: 0, updated_at: 0 },
      { id: 'area-3', name: 'Cafe', created_at: 0, updated_at: 0 },
    ];

    pickListsMock = [
      { id: 'list-2', area_id: 'area-2', created_at: 3, categories: [], auto_add_new_products: false },
      { id: 'list-3', area_id: 'area-3', created_at: 4, categories: [], auto_add_new_products: false },
      { id: 'list-1', area_id: 'area-1', created_at: 5, categories: [], auto_add_new_products: false },
    ];
  });

  it('sorts pick lists alphabetically by area name', () => {
    render(
      <MemoryRouter>
        <PickListsScreen />
      </MemoryRouter>,
    );

    const listItems = screen.getAllByRole('listitem');

    expect(within(listItems[0]).getByText('back room')).toBeVisible();
    expect(within(listItems[1]).getByText('Cafe')).toBeVisible();
    expect(within(listItems[2]).getByText('Front Counter')).toBeVisible();
  });

  it('ignores casing and whitespace when ordering pick lists', () => {
    areasMock = [
      { id: 'area-1', name: '  front counter', created_at: 0, updated_at: 0 },
      { id: 'area-2', name: '  Cafe ', created_at: 0, updated_at: 0 },
      { id: 'area-3', name: 'Back room', created_at: 0, updated_at: 0 },
    ];

    pickListsMock = [
      { id: 'list-1', area_id: 'area-1', created_at: 5, categories: [], auto_add_new_products: false },
      { id: 'list-2', area_id: 'area-2', created_at: 3, categories: [], auto_add_new_products: false },
      { id: 'list-3', area_id: 'area-3', created_at: 4, categories: [], auto_add_new_products: false },
    ];

    render(
      <MemoryRouter>
        <PickListsScreen />
      </MemoryRouter>,
    );

    const listItems = screen.getAllByRole('listitem');

    expect(within(listItems[0]).getByText(/back room/i)).toBeVisible();
    expect(within(listItems[1]).getByText(/cafe/i)).toBeVisible();
    expect(within(listItems[2]).getByText(/front counter/i)).toBeVisible();
  });

  it('opens the edit dialog and saves changes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PickListsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByLabelText(/edit/i)[0]);
    expect(screen.getByRole('dialog', { name: /edit pick list/i })).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/area/i), 'area-3');
    await user.clear(screen.getByLabelText(/notes/i));
    await user.type(screen.getByLabelText(/notes/i), 'Restock quickly');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(pickListUpdateMock).toHaveBeenCalledWith('list-2', {
      area_id: 'area-3',
      notes: 'Restock quickly',
    });
    expect(screen.queryByRole('dialog', { name: /edit pick list/i })).not.toBeInTheDocument();
  });

  it('deletes a pick list when confirmed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(
      <MemoryRouter>
        <PickListsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByLabelText(/delete/i)[0]);

    expect(pickItemDeleteMock).toHaveBeenCalled();
    expect(pickListDeleteMock).toHaveBeenCalledWith('list-2');
  });
});
