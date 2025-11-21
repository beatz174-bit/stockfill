import { Button, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAreas } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const StartPickListScreen = () => {
  const areas = useAreas();
  const db = useDatabase();
  const navigate = useNavigate();
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');

  const start = async () => {
    if (!areaId) return;
    const pickListId = uuidv4();
    await db.pickLists.add({
      id: pickListId,
      area_id: areaId,
      created_at: Date.now(),
      notes: notes.trim() || undefined,
    });
    navigate(`/pick-lists/${pickListId}`);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create Pick List
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Pick lists are reusable. Create one for each store area and update it anytime you restock.
      </Typography>
      <Stack spacing={2}>
        <TextField
          select
          fullWidth
          label="Area"
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
        >
          {areas.map((area) => (
            <MenuItem key={area.id} value={area.id}>
              {area.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          multiline
          minRows={2}
        />
        <Button variant="contained" disabled={!areaId} onClick={start}>
          Save Pick List
        </Button>
      </Stack>
    </Container>
  );
};
