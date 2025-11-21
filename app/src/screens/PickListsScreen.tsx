import { Button, Container, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { usePickLists, useAreas } from '../hooks/dataHooks';

export const PickListsScreen = () => {
  const lists = usePickLists();
  const areas = useAreas();

  const getAreaName = (areaId: string) => areas.find((a) => a.id === areaId)?.name ?? 'Unknown area';

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Pick Lists
      </Typography>
      <Button component={RouterLink} to="/start" variant="contained" sx={{ mb: 2 }}>
        Start New
      </Button>
      <List>
        {lists.map((list) => (
          <ListItemButton key={list.id} component={RouterLink} to={`/pick-lists/${list.id}`} divider>
            <ListItemText
              primary={getAreaName(list.area_id)}
              secondary={format(list.created_at, 'PPpp')}
            />
          </ListItemButton>
        ))}
      </List>
    </Container>
  );
};
