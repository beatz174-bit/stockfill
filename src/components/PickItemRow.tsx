import { Chip, Stack, Typography } from '@mui/material';
import { PickItem, PickItemStatus } from '../models/PickItem';
import { Product } from '../models/Product';
import { useLongPress } from '../hooks/useLongPress';
import { useSwipe } from '../hooks/useSwipe';

interface PickItemRowProps {
  item: PickItem;
  product?: Product | null;
  onIncrement: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const statusColor: Record<PickItemStatus, 'default' | 'success' | 'warning'> = {
  pending: 'default',
  picked: 'success',
  skipped: 'warning',
};

export const PickItemRow = ({
  item,
  product,
  onIncrement,
  onSwipeLeft,
  onSwipeRight,
}: PickItemRowProps) => {
  const longPressHandlers = useLongPress({ onLongPress: onIncrement, onClick: onIncrement });
  const swipeHandlers = useSwipe({ onSwipeLeft, onSwipeRight });
  const unitLabel = item.is_carton ? product?.bulk_name ?? 'cartons' : product?.unit_type ?? 'units';

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}
      {...longPressHandlers}
      {...swipeHandlers}
    >
      <div>
        <Typography variant="subtitle1">{product?.name ?? 'Unknown product'}</Typography>
        <Typography variant="caption" color="text.secondary">
          {item.quantity} {unitLabel}
        </Typography>
      </div>
      <Chip label={item.status} color={statusColor[item.status]} size="small" />
    </Stack>
  );
};
