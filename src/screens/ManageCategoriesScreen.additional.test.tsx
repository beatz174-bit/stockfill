// src/screens/ManageCategoriesScreen.additional.test.tsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageCategoriesScreen from './ManageCategoriesScreen';

const categories = [
  { id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 },
  { id: 'cat-2', name: 'Drinks', created_at: 0, updated_at: 0 },
];

const products = [
  { id: 'prod-1', name: 'Chips', category: 'Snacks', archived: false, created_at: 0, updated_at: 0 },
];

const categoryAddMock = vi.fn();
const categoryUpdateMock = vi.fn();
const categoryDeleteMock = vi.fn();
const productModifyMock = vi.fn();
const pickListsUpdateMock = vi.fn();

// Mock hooks
vi.mock('../hooks/dataHooks', () => ({
  useCategories: () => categories,
  useProducts: () => products,
}));

// Mock DBProvider to catch pickLists.update and categories.update/delete
vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    transaction: async (...args: unknown[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') await (cb as () => Promise<void>)();
    },
    categories: { add: categoryAddMock, update: categoryUpdateMock, delete: categoryDeleteMock },
    products: {
      where: () => ({
        equals: () => ({
          count: async () => 0,
          modify: async (changes: any) => productModifyMock(changes),
        }),
      }),
    },
    pickLists: {
      toArray: async () => [{ id: 'pl-1', categories: ['Snacks'], created_at: 0, updated_at: 0 }],
      update: pickListsUpdateMock,
    },
  }),
}));

describe('ManageCategoriesScreen additional', () => {
  beforeEach(() => {
    categoryAddMock.mockReset();
    categoryUpdateMock.mockReset();
    categoryDeleteMock.mockReset();
    productModifyMock.mockReset();
    pickListsUpdateMock.mockReset();
  });

  it('updates pickLists when category name is changed (legacy name in pickLists.categories)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /edit snacks/i }));
    const editField = screen.getByDisplayValue(/snacks/i);
    await user.clear(editField);
    await user.type(editField, 'Treats');
    await user.click(screen.getByRole('button', { name: /save category/i }));

    // categories.update should have been called
    expect(categoryUpdateMock).toHaveBeenCalled();

    // and pickLists.update should have been called to update the categories array
    expect(pickListsUpdateMock).toHaveBeenCalled();
    expect(await screen.findByText(/category updated/i)).toBeVisible();
  });

  it('deletes category when no products reference it', async () => {
    // products.where().equals().count() is 0 in our mock, so delete should proceed
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    // Click the "Delete Snacks" icon/button (specific aria-label)
    await user.click(screen.getByRole('button', { name: /delete snacks/i }));

    // Wait for the delete mock to be called (component calls the onDelete handler)
    await waitFor(() => {
      expect(categoryDeleteMock).toHaveBeenCalled();
    });

    // And assert the success alert is shown
    expect(await screen.findByText(/category deleted/i)).toBeVisible();
  });

  it('prevents renaming to an existing name', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /edit snacks/i }));
    const editField = screen.getByDisplayValue(/snacks/i);
    await user.clear(editField);
    await user.type(editField, 'Drinks'); // name that already exists
    await user.click(screen.getByRole('button', { name: /save category/i }));

    // Should show "already exists" and NOT call update
    expect(categoryUpdateMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/already exists/i)).toBeVisible();
  });
});
