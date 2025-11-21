import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManageAreasScreen } from './ManageAreasScreen';

const areasMock = [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }];

vi.mock('../hooks/dataHooks', () => ({
  useAreas: () => areasMock,
}));

const areaDeleteMock = vi.fn();
const pickListCountMock = vi.fn();

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    areas: {
      add: vi.fn(),
      update: vi.fn(),
      delete: areaDeleteMock,
    },
    pickLists: {
      where: () => ({
        equals: () => ({
          count: pickListCountMock,
        }),
      }),
    },
  }),
}));

describe('ManageAreasScreen deletion safeguards', () => {
  it('prevents deleting an area that is used by pick lists', async () => {
    pickListCountMock.mockResolvedValueOnce(1);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageAreasScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete front counter/i }));

    expect(areaDeleteMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/cannot delete this area while 1 pick list\(s\) use it/i),
    ).toBeVisible();
  });
});
