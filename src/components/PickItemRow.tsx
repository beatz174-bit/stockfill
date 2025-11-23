import { Add, Delete, Inventory2, Remove } from '@mui/icons-material';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

interface PickItemRowProps {
  item: PickItem;
  product?: Product | null;
  onIncrementQuantity: () => void;
  onDecrementQuantity: () => void;
  onToggleCarton: () => void;
  onStatusChange: (status: PickItem['status']) => void;
  onDelete: () => void;
}

export const PickItemRow = ({
  item,
  product,
  onIncrementQuantity,
  onDecrementQuantity,
  onToggleCarton,
  onStatusChange,
  onDelete,
}: PickItemRowProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const packagingLabel = item.is_carton
    ? product?.bulk_name ?? 'Carton'
    : product?.unit_type ?? 'Unit';

  const toggleStatus = (checked: boolean) => {
    onStatusChange(checked ? 'picked' : 'pending');
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsConfirmOpen(false);
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
        <IconButton
          aria-label={`Switch to ${item.is_carton ? 'unit' : 'carton'} packaging`}
          color={item.is_carton ? 'primary' : 'default'}
          onClick={onToggleCarton}
          sx={{
            boxShadow: item.is_carton
              ? (theme) => `0 0 0 8px ${alpha(theme.palette.primary.main, 0.15)}`
              : 'none',
          }}
        >
          <Inventory2 />
        </IconButton>
        <IconButton
          aria-label="Decrease quantity"
          color="primary"
          onClick={onDecrementQuantity}
        >
          <Remove />
        </IconButton>
        <IconButton
          aria-label="Increase quantity"
          color="primary"
          onClick={onIncrementQuantity}
        >
          <Add />
        </IconButton>
        <IconButton
          color="error"
          onClick={() => setIsConfirmOpen(true)}
          aria-label="Delete item"
        >
          <Delete />
        </IconButton>
      </Stack>

      <Dialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
      >
        <DialogTitle id="confirm-delete-title">Delete item</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delete-description">
            {`Are you sure you want to delete ${product?.name ?? 'this product'} from the pick list?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)} aria-label="Cancel delete" autoFocus>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
