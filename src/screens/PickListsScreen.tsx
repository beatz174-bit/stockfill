import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { usePickLists, useAreas } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';
import { PickList } from '../models/PickList';

export const PickListsScreen = () => {
  const lists = usePickLists();
  const areas = useAreas();
  const db = useDatabase();
  const [editingList, setEditingList] = useState<PickList | null>(null);
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');

  const areaNameById = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach((area) => map.set(area.id, area.name));
    return map;
  }, [areas]);

  const sortedLists = useMemo(() => {
    const locale = new Intl.Collator(undefined, { sensitivity: 'base' });
    const normalizeAreaName = (areaId: string) =>
      (areaNameById.get(areaId) ?? 'Unknown area').trim();

    return [...lists].sort((a, b) => {
      const nameComparison = locale.compare(
        normalizeAreaName(a.area_id),
        normalizeAreaName(b.area_id),
      );
      if (nameComparison !== 0) return nameComparison;
      return a.created_at - b.created_at;
    });
  }, [areaNameById, lists]);

  const getAreaName = (areaId: string) => areaNameById.get(areaId) ?? 'Unknown area';

  const openEdit = (list: PickList) => {
    setEditingList(list);
    setAreaId(list.area_id);
    setNotes(list.notes ?? '');
  };

  const closeEdit = () => {
    setEditingList(null);
    setAreaId('');
    setNotes('');
  };

  const saveEdit = async () => {
    if (!editingList || !areaId) return;
    const listId = editingList.id;
    const trimmedNotes = notes.trim() || undefined;
    closeEdit();
    await db.pickLists.update(listId, {
      area_id: areaId,
      notes: trimmedNotes,
    });
  };

  const deleteList = async (list: PickList) => {
    const confirmed = window.confirm('Remove this pick list and its items?');
    if (!confirmed) return;
    await db.pickItems.where('pick_list_id').equals(list.id).delete();
    await db.pickLists.delete(list.id);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Pick Lists
      </Typography>
      <Button component={RouterLink} to="/start" variant="contained" sx={{ mb: 2 }}>
        Add Pick List
      </Button>
      <List>
        {sortedLists.map((list) => (
          <ListItem key={list.id} divider secondaryAction={
            <Stack direction="row" spacing={1}>
              <IconButton
                edge="end"
                aria-label="Edit"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  openEdit(list);
                }}
              >
                <Edit />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  deleteList(list);
                }}
              >
                <Delete />
              </IconButton>
            </Stack>
          }>
            <ListItemButton component={RouterLink} to={`/pick-lists/${list.id}`}>
              <ListItemText
                primary={getAreaName(list.area_id)}
                secondary={
                  <Stack spacing={0.5}>
                    {list.notes ? <span>{list.notes}</span> : null}
                    <Typography variant="caption" color="text.secondary">
                      Created {format(list.created_at, 'PPpp')}
                    </Typography>
                  </Stack>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {editingList ? (
        <Dialog open onClose={closeEdit} fullWidth>
          <DialogTitle>Edit Pick List</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} mt={1}>
              <TextField
                select
                SelectProps={{ native: true }}
                fullWidth
                label="Area"
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </TextField>
              <TextField
                label="Notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEdit}>Cancel</Button>
            <Button variant="contained" onClick={saveEdit} disabled={!areaId}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Container>
  );
};
