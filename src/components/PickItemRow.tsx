import { Add, Delete } from '@mui/icons-material';
import { Button, Checkbox, IconButton, Stack, Typography } from '@mui/material';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

interface PickItemRowProps {
  item: PickItem;
  product?: Product | null;
  onIncrementQuantity: () => void;
  onToggleCarton: () => void;
  onStatusChange: (status: PickItem['status']) => void;
  onDelete: () => void;
}

export const PickItemRow = ({
  item,
  product,
  onIncrementQuantity,
  onToggleCarton,
  onStatusChange,
  onDelete,
}: PickItemRowProps) => {
  const packagingLabel = item.is_carton
    ? product?.bulk_name ?? 'Carton'
    : product?.unit_type ?? 'Unit';

  const toggleStatus = (checked: boolean) => {
    onStatusChange(checked ? 'picked' : 'pending');
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
        <Checkbox
          edge="start"
          checked={item.status === 'picked'}
          onChange={(event) => toggleStatus(event.target.checked)}
          inputProps={{ 'aria-label': 'Toggle picked status' }}
        />
        <Stack spacing={0.25} minWidth={0} flex={1}>
          <Typography variant="subtitle1" noWrap>
            {product?.name ?? 'Unknown product'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Qty: {item.quantity} {packagingLabel}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant={item.is_carton ? 'contained' : 'outlined'}
          size="small"
          onClick={onToggleCarton}
        >
          {item.is_carton ? 'Carton' : 'Unit'}
        </Button>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={onIncrementQuantity}>
          Add 1
        </Button>
        <IconButton color="error" onClick={onDelete} aria-label="Delete item">
          <Delete />
        </IconButton>
      </Stack>
    </Stack>
  );
};
