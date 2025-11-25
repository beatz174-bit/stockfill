import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ManageAreasScreen from './ManageAreasScreen';

const areasMock = [{ id: 'area-1', name: 'Front Counter', created_at: 0, updated_at: 0 }];

vi.mock('../hooks/dataHooks', () => ({
  useAreas: () => areasMock,
}));

const areaDeleteMock = vi.fn();
const areaAddMock = vi.fn();
const areaUpdateMock = vi.fn();
const pickListCountMock = vi.fn();

vi.mock('../context/DBProvider', () => ({
  useDatabase: () => ({
    areas: {
      add: areaAddMock,
      update: areaUpdateMock,
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

  it('adds a new area and clears the input', async () => {
    pickListCountMock.mockResolvedValue(0);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManageAreasScreen />
      </MemoryRouter>,
    );

    const nameField = screen.getByLabelText(/area name/i);
    await user.type(nameField, 'Bakery');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(areaAddMock).toHaveBeenCalledTimes(1);
    expect((areaAddMock.mock.calls[0][0] as { name: string }).name).toBe('Bakery');
    expect((nameField as HTMLInputElement).value).toBe('');
  });

  it('updates an area name and shows feedback', async () => {
    pickListCountMock.mockResolvedValue(0);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManageAreasScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /edit front counter/i }));
    const editField = screen.getByDisplayValue(/front counter/i);
    await user.clear(editField);
    await user.type(editField, 'Updated Front');
    await user.click(screen.getByRole('button', { name: /save area/i }));

    expect(areaUpdateMock).toHaveBeenCalledWith('area-1', expect.objectContaining({ name: 'Updated Front' }));
    expect(await screen.findByText(/area updated/i)).toBeVisible();
  });
});
