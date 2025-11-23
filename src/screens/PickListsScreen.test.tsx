import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PickListsScreen } from './PickListsScreen';

const areasMock = [
  { id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 },
  { id: 'area-2', name: 'back room', created_at: 0, updated_at: 0 },
  { id: 'area-3', name: 'Cafe', created_at: 0, updated_at: 0 },
];

const pickListsMock = [
  { id: 'list-2', area_id: 'area-2', created_at: 3, categories: [], auto_add_new_products: false },
  { id: 'list-3', area_id: 'area-3', created_at: 4, categories: [], auto_add_new_products: false },
  { id: 'list-1', area_id: 'area-1', created_at: 5, categories: [], auto_add_new_products: false },
];

vi.mock('../hooks/dataHooks', () => ({
  usePickLists: () => pickListsMock,
  useAreas: () => areasMock,
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      where: () => ({
        equals: () => ({ delete: vi.fn() }),
      }),
    },
    pickLists: {
      update: vi.fn(),
      delete: vi.fn(),
      where: () => ({
        equals: () => ({ delete: vi.fn() }),
      }),
    },
  }),
}));

describe('PickListsScreen sorting', () => {
  it('sorts pick lists alphabetically by area name', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PickListsScreen />
      </MemoryRouter>,
    );

    const listItems = screen.getAllByRole('listitem');

    expect(within(listItems[0]).getByText('back room')).toBeVisible();
    expect(within(listItems[1]).getByText('Cafe')).toBeVisible();
    expect(within(listItems[2]).getByText('Front Counter')).toBeVisible();
  });
});
