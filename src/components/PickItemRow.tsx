import { Add, Delete } from '@mui/icons-material';
import { Button, Checkbox, Stack, Typography } from '@mui/material';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

interface PickItemRowProps {
  item: PickItem;
  product?: Product | null;
  onIncrementUnit: () => void;
  onIncrementBulk: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export const PickItemRow = ({
  item,
  product,
  onIncrementUnit,
  onIncrementBulk,
  onToggleStatus,
  onDelete,
}: PickItemRowProps) => {
  const isPicked = item.status === 'picked';

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}
    >
      <Stack direction="row" alignItems="center" spacing={1} flex={1}>
        <Checkbox color="success" checked={isPicked} onChange={onToggleStatus} />
        <Stack spacing={0.5} flex={1}>
          <Typography
            variant="subtitle1"
            sx={{ textDecoration: isPicked ? 'line-through' : 'none', display: 'flex', gap: 0.5, alignItems: 'center' }}
          >
            {isPicked ? '✔️' : null} {product?.name ?? 'Unknown product'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.quantity_units} units / {item.quantity_bulk} bulk
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={onIncrementUnit}>
          Unit
        </Button>
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={onIncrementBulk}>
          Bulk
        </Button>
        <Button variant="text" color="error" size="small" startIcon={<Delete />} onClick={onDelete}>
          Delete
        </Button>
      </Stack>
    </Stack>
  );
};
