// src/screens/ManageCategoriesScreen.test.tsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageCategoriesScreen from './ManageCategoriesScreen';

const categoriesMock = [{ id: 'cat-1', name: 'Snacks', created_at: 0, updated_at: 0 }];
const productsMock = [
  {
    id: 'prod-1',
    name: 'Chips',
    category: 'Snacks',
    archived: false,
    created_at: 0,
    updated_at: 0,
  },
];

vi.mock('../hooks/dataHooks', () => ({
  useCategories: () => categoriesMock,
  useProducts: () => productsMock,
}));

const categoryDeleteMock = vi.fn();
const categoryAddMock = vi.fn();
const categoryUpdateMock = vi.fn();
const productModifyMock = vi.fn();

// Improved DB mock: products.where(...).equals(value) returns an object implementing count() and modify().
// count() resolves to 1 when equals('Snacks') is called (simulate one product referencing the category name),
// otherwise resolves to 0. modify() calls our productModifyMock so tests can assert it was invoked.
//
// Also, transaction accepts a variable number of args and treats the last arg as the callback,
// which mirrors the real db.transaction usage in the component.
vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    transaction: async (...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        // run the callback (which may perform db operations)
        await (callback as () => Promise<void>)();
      } else {
        // nothing to do if no callback provided
      }
    },
    categories: {
      add: categoryAddMock,
      update: categoryUpdateMock,
      delete: categoryDeleteMock,
    },
    products: {
      where: () => ({
        equals: (value: string) => ({
          // count returns promise resolving to number of products matching 'value'
          count: async () => {
            if (typeof value === 'string' && value.toLowerCase() === 'snacks') return 1;
            return 0;
          },
          // modify is implemented so saveCategory can call it; record when called
          modify: async (changes: any) => {
            productModifyMock(changes);
            // simulate modifying and returning something
            return undefined;
          },
        }),
      }),
    },
    pickLists: {
      toArray: async () => [],
      update: async () => undefined,
    },
  }),
}));

describe('ManageCategoriesScreen deletion safeguards', () => {
  beforeEach(() => {
    categoryAddMock.mockReset();
    categoryUpdateMock.mockReset();
    categoryDeleteMock.mockReset();
    productModifyMock.mockReset();
  });

  it('shows an error when trying to delete an in-use category', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete snacks/i }));

    expect(categoryDeleteMock).not.toHaveBeenCalled();

    // The Alert may contain the full sentence; match a portion of it (case-insensitive)
    expect(
      await screen.findByText(/cannot delete 'snacks' while 1 product\(s\) use it/i),
    ).toBeVisible();
  });

  it('adds a category when a unique name is provided', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    const nameField = screen.getByLabelText(/category name/i);
    await user.clear(nameField);
    await user.type(nameField, 'Drinks');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(categoryAddMock).toHaveBeenCalledTimes(1);
    expect((nameField as HTMLInputElement).value).toBe('');
    expect(await screen.findByText(/category added/i)).toBeVisible();
  });

  it('prevents adding a duplicate category name', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    const nameField = screen.getByLabelText(/category name/i);
    await user.clear(nameField);
    await user.type(nameField, 'Snacks');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(categoryAddMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/already exists/i)).toBeVisible();
  });

  it('updates a category and cascades the change to products', async () => {
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

    expect(categoryUpdateMock).toHaveBeenCalledWith('cat-1', expect.objectContaining({ name: 'Treats' }));
    expect(productModifyMock).toHaveBeenCalled();
    expect(await screen.findByText(/category updated/i)).toBeVisible();
  });
});
