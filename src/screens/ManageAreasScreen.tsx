import { AlertColor, Container, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { EditableEntityList, ActionOutcome } from '../components/EditableEntityList';
import { useDatabase } from '../context/DBProvider';
import { useAreas } from '../hooks/dataHooks';

const ManageAreasScreen = () => {
  const db = useDatabase();
  const areas = useAreas();

  const addArea = async (name: string): Promise<ActionOutcome> => {
    await db.areas.add({ id: uuidv4(), name, created_at: Date.now(), updated_at: Date.now() });
    return { text: 'Area added.', severity: 'success' };
  };

  const saveArea = async (areaId: string, updatedName: string): Promise<ActionOutcome> => {
    await db.areas.update(areaId, { name: updatedName, updated_at: Date.now() });
    return { text: 'Area updated.', severity: 'success' };
  };

  const deleteArea = async (areaId: string): Promise<ActionOutcome> => {
    const usageCount = await db.pickLists.where('area_id').equals(areaId).count();
    if (usageCount > 0) {
      return {
        text: `Cannot delete this area while ${usageCount} pick list(s) use it. Remove those lists first.`,
        severity: 'error' satisfies AlertColor,
        success: false,
      };
    }

    await db.areas.delete(areaId);
    return { text: 'Area deleted.', severity: 'success' };
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Areas
      </Typography>
      <EditableEntityList
        nameLabel="Area name"
        addButtonLabel="Add"
        entityLabel="Area"
        entities={areas.map((area) => ({ id: area.id, name: area.name }))}
        onAdd={addArea}
        onUpdate={saveArea}
        onDelete={(areaId, areaName) => deleteArea(areaId)}
      />
    </Container>
  );
};

export default ManageAreasScreen;
