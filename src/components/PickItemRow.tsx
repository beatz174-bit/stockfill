import { Add, Delete } from '@mui/icons-material';
import { Button, Checkbox, Stack, Typography } from '@mui/material';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

interface PickItemRowProps {
  item: PickItem;
  product?: Product | null;
  onIncrementQuantity: () => void;
  onToggleCarton: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const PickItemRow = ({
  item,
  product,
  onIncrementQuantity,
  onToggleCarton,
  onSwipeLeft,
  onSwipeRight,
}: PickItemRowProps) => {
  const longPressHandlers = useLongPress({ onLongPress: onToggleCarton, onClick: onIncrementQuantity });
  const swipeHandlers = useSwipe({ onSwipeLeft, onSwipeRight });

  const isCarton = item.quantity_bulk > 0;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}
    >
      <div>
        <Typography variant="subtitle1">{product?.name ?? 'Unknown product'}</Typography>
        <Typography variant="caption" color="text.secondary">
          Qty: {item.quantity_units}
        </Typography>
      </div>
      <Stack direction="row" spacing={1} alignItems="center">
        {isCarton ? <Chip label="Carton" color="primary" size="small" /> : null}
        <Chip label={item.status} color={statusColor[item.status]} size="small" />
      </Stack>
    </Stack>
  );
};
