import { Button, Container, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAreas } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const ManageAreasScreen = () => {
  const db = useDatabase();
  const areas = useAreas();
  const [name, setName] = useState('');

  const addArea = async () => {
    if (!name) return;
    await db.areas.add({ id: uuidv4(), name, created_at: Date.now(), updated_at: Date.now() });
    setName('');
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Areas
      </Typography>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1}>
          <TextField fullWidth label="Area name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button variant="contained" onClick={addArea} disabled={!name}>
            Add
          </Button>
        </Stack>
        <List>
          {areas.map((area) => (
            <ListItem key={area.id} divider>
              <ListItemText primary={area.name} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Container>
  );
};
