import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditableEntityList from '../EditableEntityList';
import { makeNamedError } from '../../test/makeNamedError';

const entities = [
  { id: '1', name: 'First' },
  { id: '2', name: 'Second' },
];

describe('EditableEntityList', () => {
  it('disables add button for blank names and when validateName fails', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <EditableEntityList
        nameLabel="Name"
        entities={entities}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        validateName={(value) => value !== 'Invalid'}
      />,
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();

    await user.type(screen.getByLabelText(/name/i), '   ');
    expect(addButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Invalid');
    expect(addButton).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows feedback for failed add and update operations', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue({ success: false, text: 'x', severity: 'error' });
    const onUpdate = vi.fn().mockRejectedValue(makeNamedError('Unexpected'));

    render(
      <EditableEntityList
        nameLabel="Name"
        entities={entities}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/name/i), 'New One');
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => expect(screen.getByText('x')).toBeInTheDocument());

    await user.click(screen.getByLabelText(/edit first/i));
    await user.clear(screen.getByDisplayValue('First'));
    await user.type(screen.getByDisplayValue('First'), 'Updated');
    await user.click(screen.getByLabelText(/save item/i));

    await waitFor(() =>
      expect(screen.getByText(/unable to update item/i)).toBeInTheDocument(),
    );
  });

  it('supports editing cancel/save flows and delete feedback', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({ text: 'Deleted', severity: 'success' });
    const onUpdate = vi.fn().mockResolvedValue({ text: 'Saved', severity: 'success' });

    render(
      <EditableEntityList
        nameLabel="Name"
        entities={entities}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByLabelText(/edit second/i));
    const editInput = screen.getByDisplayValue('Second');
    await user.clear(editInput);
    await user.type(editInput, 'Second Updated');
    await user.click(screen.getByLabelText(/save item/i));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    await user.click(screen.getByLabelText(/delete second updated/i));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('2', 'Second Updated'));
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });
});
