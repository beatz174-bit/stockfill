import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageProductsScreen from '../ManageProductsScreen';
import { createMockDb } from '../../testUtils/mockDb';

let mockDb = createMockDb();
const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();

vi.mock('../../hooks/dataHooks', () => ({
  useProducts: () => mockUseProducts(),
  useCategories: () => mockUseCategories(),
}));

vi.mock('../../context/DBProvider', () => ({
  useDatabase: () => mockDb,
}));

const clickSave = async (user: ReturnType<typeof userEvent.setup>) => {
  const saveButton = screen
    .getAllByRole('button')
    .find((btn) => /save product/i.test(btn.getAttribute('aria-label') || btn.textContent || ''));
  if (!saveButton) throw new Error('Save button not found');
  await user.click(saveButton);
};

describe('ManageProductsScreen updateProduct', () => {
  beforeEach(() => {
    const timestamp = Date.now();
    mockDb = createMockDb({
      products: [
        {
          id: 'p1',
          name: 'First',
          category: 'cat-1',
          unit_type: 'unit',
          bulk_name: 'carton',
          archived: false,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          id: 'p2',
          name: 'Second',
          category: 'cat-2',
          unit_type: 'unit',
          bulk_name: 'carton',
          archived: false,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      categories: [
        { id: 'cat-1', name: 'Cat One', created_at: timestamp, updated_at: timestamp },
        { id: 'cat-2', name: 'Cat Two', created_at: timestamp, updated_at: timestamp },
      ],
    });
    mockUseProducts.mockReturnValue(mockDb.products.items);
    mockUseCategories.mockReturnValue(mockDb.categories.items);
  });

  it('rethrows DuplicateNameError for ProductRow to handle', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/edit second/i));
    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'First');
    await clickSave(user);

    await waitFor(() =>
      expect(
        screen.getByText('A product with this name already exists.'),
      ).toBeInTheDocument(),
    );
  });

  it('rethrows DuplicateBarcodeError for ProductRow to handle', async () => {
    const user = userEvent.setup();
    mockDb.products.items[0].barcode = 'dup';
    mockUseProducts.mockReturnValue([...mockDb.products.items]);

    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/edit second/i));
    await user.type(screen.getByLabelText(/barcode/i), 'dup');
    await clickSave(user);

    await waitFor(() =>
      expect(
        screen.getByText('This barcode is already assigned to another product.'),
      ).toBeInTheDocument(),
    );
  });

  it('creates category when missing and saves product with new category id', async () => {
    const user = userEvent.setup();
    const timestamp = Date.now();
    mockDb = createMockDb({
      products: [
        {
          id: 'p3',
          name: 'Needs Category',
          category: 'Untracked',
          unit_type: 'unit',
          bulk_name: 'carton',
          archived: false,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      categories: [],
    });
    mockUseProducts.mockReturnValue(mockDb.products.items);
    mockUseCategories.mockReturnValue([]);

    render(
      <MemoryRouter>
        <ManageProductsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/edit needs category/i));
    await user.type(screen.getByLabelText(/^name$/i), '!');
    await clickSave(user);

    await waitFor(() => {
      expect(mockDb.categories.items.some((c) => c.name === 'Untracked')).toBe(true);
      const updated = mockDb.products.items.find((p) => p.id === 'p3');
      const categoryId = mockDb.categories.items.find((c) => c.name === 'Untracked')?.id;
      expect(updated?.category).toBe(categoryId);
    });
  });
});
