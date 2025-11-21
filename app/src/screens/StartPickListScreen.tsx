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

  const start = async () => {
    if (!areaId) return;
    const pickListId = uuidv4();
    await db.pickLists.add({ id: pickListId, area_id: areaId, created_at: Date.now() });
    navigate(`/pick-lists/${pickListId}`);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Start Pick List
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
        <Button variant="contained" disabled={!areaId} onClick={start}>
          Start
        </Button>
      </Stack>
    </Container>
  );
};
