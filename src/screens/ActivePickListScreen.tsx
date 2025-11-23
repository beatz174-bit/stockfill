import { Button, Container, Stack, Typography } from '@mui/material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useAreas, usePickItems, usePickList, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';
import { PickItemRow } from '../components/PickItemRow';
import { PickItem } from '../models/PickItem';

export const ActivePickListScreen = () => {
  const { id } = useParams();
  const pickList = usePickList(id);
  const items = usePickItems(id);
  const products = useProducts();
  const areas = useAreas();
  const db = useDatabase();
  const navigate = useNavigate();

  const areaName = useMemo(
    () => areas.find((area) => area.id === pickList?.area_id)?.name ?? 'Area',
    [areas, pickList?.area_id],
  );

  const handleIncrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;
    await db.pickItems.update(itemId, {
      quantity: existing.quantity + 1,
      updated_at: Date.now(),
    });
  };

  const handleDecrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = Math.max(1, (existing.quantity || 1) - 1);

    await db.pickItems.update(itemId, {
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleToggleCarton = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    await db.pickItems.update(itemId, {
      is_carton: !existing.is_carton,
      quantity: existing.quantity || 1,
      updated_at: Date.now(),
    });
  };

  const handleStatusChange = async (itemId: string, status: PickItem['status']) => {
    const nextStatus = status === 'picked' ? 'picked' : 'pending';
    await db.pickItems.update(itemId, { status: nextStatus, updated_at: Date.now() });
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.pickItems.delete(itemId);
  };

  const returnToLists = () => {
    navigate('/pick-lists');
  };

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{areaName} List</Typography>
        <Button component={RouterLink} to={`/pick-lists/${id}/add-item`} variant="contained">
          Add Item
        </Button>
      </Stack>
      {pickList?.notes ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {pickList.notes}
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {items.map((item) => (
          <PickItemRow
            key={item.id}
            item={item}
            product={products.find((p) => p.id === item.product_id)}
            onIncrementQuantity={() => handleIncrementQuantity(item.id)}
            onDecrementQuantity={() => handleDecrementQuantity(item.id)}
            onToggleCarton={() => handleToggleCarton(item.id)}
            onStatusChange={(status) => handleStatusChange(item.id, status)}
            onDelete={() => handleDeleteItem(item.id)}
          />
        ))}
      </Stack>
      <Button fullWidth sx={{ mt: 3 }} variant="outlined" onClick={returnToLists}>
        Save and Return
      </Button>
    </Container>
  );
};
