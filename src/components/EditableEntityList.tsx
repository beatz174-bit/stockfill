import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  AlertColor,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
} from '@mui/material';
import { useMemo, useState } from 'react';

export interface EditableEntity {
  id: string;
  name: string;
  secondaryText?: string;
}

export interface ActionOutcome {
  text?: string;
  severity?: AlertColor;
  success?: boolean;
}

interface EditableEntityListProps {
  nameLabel: string;
  addButtonLabel?: string;
  entityLabel?: string;
  addPlaceholder?: string;
  entities: EditableEntity[];
  validateName?: (name: string, entityId?: string | null) => boolean;
  onAdd: (name: string) => Promise<ActionOutcome | void>;
  onUpdate: (id: string, name: string) => Promise<ActionOutcome | void>;
  onDelete: (id: string, name: string) => Promise<ActionOutcome | void>;
}

interface FeedbackState {
  text: string;
  severity: AlertColor;
}

export const EditableEntityList = ({
  nameLabel,
  addButtonLabel = 'Add',
  entityLabel = 'Item',
  addPlaceholder,
  entities,
  validateName,
  onAdd,
  onUpdate,
  onDelete,
}: EditableEntityListProps) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const isNameValid = useMemo(() => {
    return (value: string, entityId: string | null) => {
      const trimmed = value.trim();
      if (!trimmed) return false;
      if (validateName) return validateName(trimmed, entityId);
      return true;
    };
  }, [validateName]);

  const applyOutcome = (outcome: ActionOutcome | void, defaultText: string, defaultSeverity: AlertColor = 'success') => {
    const success = outcome?.success ?? outcome?.severity !== 'error';
    const text = outcome?.text ?? defaultText;
    const severity = outcome?.severity ?? defaultSeverity;
    setFeedback({ text, severity });
    return success;
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!isNameValid(newName, null)) return;
    try {
      const success = applyOutcome(await onAdd(trimmed), `${entityLabel} added.`);
      if (success) {
        setNewName('');
      }
    } catch (error) {
      setFeedback({ text: `Unable to add ${entityLabel.toLowerCase()}.`, severity: 'error' });
    }
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setFeedback(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!isNameValid(editName, editingId)) return;

    try {
      const success = applyOutcome(await onUpdate(editingId, trimmed), `${entityLabel} updated.`);
      if (success) {
        cancelEditing();
      }
    } catch (error) {
      setFeedback({ text: `Unable to update ${entityLabel.toLowerCase()}.`, severity: 'error' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const success = applyOutcome(await onDelete(id, name), `${entityLabel} deleted.`);
      if (success && editingId === id) {
        cancelEditing();
      }
    } catch (error) {
      setFeedback({ text: `Unable to delete ${entityLabel.toLowerCase()}.`, severity: 'error' });
    }
  };

  const canAdd = isNameValid(newName, null);
  const canSave = editingId ? isNameValid(editName, editingId) : false;

  return (
    <Stack spacing={2}>
      {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : null}
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          label={nameLabel}
          placeholder={addPlaceholder}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button variant="contained" onClick={handleAdd} disabled={!canAdd}>
          {addButtonLabel}
        </Button>
      </Stack>
      <List>
        {entities.map((entity) => (
          <ListItem key={entity.id} divider>
            {editingId === entity.id ? (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  fullWidth
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <IconButton color="primary" onClick={handleSave} disabled={!canSave} aria-label={`Save ${entityLabel}`}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={cancelEditing} aria-label="Cancel editing">
                  <CloseIcon />
                </IconButton>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <ListItemText primary={entity.name} secondary={entity.secondaryText} />
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    onClick={() => startEditing(entity.id, entity.name)}
                    aria-label={`Edit ${entity.name}`}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(entity.id, entity.name)}
                    aria-label={`Delete ${entity.name}`}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            )}
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};

export default EditableEntityList;
