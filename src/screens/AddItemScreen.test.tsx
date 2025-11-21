import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddItemScreen } from './AddItemScreen';

const addMock = vi.fn();

vi.mock('../hooks/dataHooks', () => ({
  usePickItems: () => [],
  useProducts: () => [
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
  ],
}));

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    pickItems: {
      add: addMock,
    },
  }),
}));

describe('AddItemScreen product search', () => {
  it('filters the product list based on the search query', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/pick-lists/1/add-item']}>
        <Routes>
          <Route path="/pick-lists/:id/add-item" element={<AddItemScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText(/search products/i), 'cola');
    await user.click(screen.getByLabelText(/product/i));

    expect(screen.getByRole('option', { name: /cola \(drinks\)/i })).toBeVisible();
    expect(screen.queryByRole('option', { name: /chips \(snacks\)/i })).not.toBeInTheDocument();
  });
});
