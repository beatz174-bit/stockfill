import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManageCategoriesScreen } from './ManageCategoriesScreen';

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

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    categories: {
      add: vi.fn(),
      update: vi.fn(),
      delete: categoryDeleteMock,
    },
    products: {
      where: () => ({
        equals: () => ({
          modify: vi.fn(),
        }),
      }),
    },
  }),
}));

describe('ManageCategoriesScreen deletion safeguards', () => {
  it('shows an error when trying to delete an in-use category', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ManageCategoriesScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete snacks/i }));

    expect(categoryDeleteMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/cannot delete 'snacks' while 1 product\(s\) use it/i),
    ).toBeVisible();
  });
});
