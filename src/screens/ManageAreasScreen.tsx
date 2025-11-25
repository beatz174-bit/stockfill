import {
  Alert,
  AlertColor,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAreas } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

const ManageAreasScreen = () => {
  const db = useDatabase();
  const areas = useAreas();
  const [name, setName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; severity: AlertColor } | null>(null);

  const addArea = async () => {
    if (!name) return;
    await db.areas.add({ id: uuidv4(), name, created_at: Date.now(), updated_at: Date.now() });
    setName('');
  };

  const startEditing = (areaId: string, currentName: string) => {
    setEditingAreaId(areaId);
    setEditName(currentName);
    setFeedback(null);
  };

  const saveArea = async () => {
    if (!editingAreaId || !editName) return;
    await db.areas.update(editingAreaId, { name: editName, updated_at: Date.now() });
    setEditingAreaId(null);
    setEditName('');
    setFeedback({ text: 'Area updated.', severity: 'success' });
  };

  const cancelEditing = () => {
    setEditingAreaId(null);
    setEditName('');
  };

  const deleteArea = async (areaId: string) => {
    const usageCount = await db.pickLists.where('area_id').equals(areaId).count();
    if (usageCount > 0) {
      setFeedback({
        text: `Cannot delete this area while ${usageCount} pick list(s) use it. Remove those lists first.`,
        severity: 'error',
      });
      return;
    }
    await db.areas.delete(areaId);
    if (editingAreaId === areaId) {
      cancelEditing();
    }
    setFeedback({ text: 'Area deleted.', severity: 'success' });
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Areas
      </Typography>
      <Stack spacing={2}>
        {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : null}
        <Stack direction="row" spacing={1}>
          <TextField fullWidth label="Area name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button variant="contained" onClick={addArea} disabled={!name}>
            Add
          </Button>
        </Stack>
        <List>
          {areas.map((area) => (
            <ListItem key={area.id} divider>
              {editingAreaId === area.id ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <IconButton color="primary" onClick={saveArea} disabled={!editName} aria-label="Save area">
                    <CheckIcon />
                  </IconButton>
                  <IconButton onClick={cancelEditing} aria-label="Cancel editing">
                    <CloseIcon />
                  </IconButton>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <ListItemText primary={area.name} />
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      onClick={() => startEditing(area.id, area.name)}
                      aria-label={`Edit ${area.name}`}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => deleteArea(area.id)}
                      aria-label={`Delete ${area.name}`}
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
    </Container>
  );
};

export default ManageAreasScreen