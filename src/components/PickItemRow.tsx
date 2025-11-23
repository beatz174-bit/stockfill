import { Add, Close, Delete, Inventory2, MoreHoriz, Remove } from '@mui/icons-material';
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
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';
import { PickItem } from '../models/PickItem';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE, Product } from '../models/Product';

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
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const packagingLabel = item.is_carton
    ? product?.bulk_name ?? DEFAULT_BULK_NAME
    : product?.unit_type ?? DEFAULT_UNIT_TYPE;

  const toggleStatus = (checked: boolean) => {
    onStatusChange(checked ? 'picked' : 'pending');
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsConfirmOpen(false);
  };

  const openControls = () => setIsControlsOpen(true);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 1,
        cursor: isDesktop ? 'default' : 'pointer',
      }}
      {...(!isDesktop
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: openControls,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openControls();
              }
            },
          }
        : undefined)}
    >
      <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
        <Checkbox
          edge="start"
          checked={item.status === 'picked'}
          onChange={(event) => toggleStatus(event.target.checked)}
          inputProps={{ 'aria-label': 'Toggle picked status' }}
        />
        <Stack spacing={0.25} minWidth={0} flex={1}>
          <Typography variant="subtitle1" noWrap sx={{ minWidth: 0 }}>
            {product?.name ?? 'Unknown product'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {`Qty: ${item.quantity} ${packagingLabel}`}
          </Typography>
        </Stack>
      </Stack>
      {isDesktop ? (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
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
          <IconButton aria-label="Decrease quantity" color="primary" onClick={onDecrementQuantity}>
            <Remove />
          </IconButton>
          <IconButton aria-label="Increase quantity" color="primary" onClick={onIncrementQuantity}>
            <Add />
          </IconButton>
          <IconButton
            color="error"
            onClick={() => setIsConfirmOpen(true)}
            aria-label="Delete item"
            sx={{ ml: { xs: 0, sm: 1 } }}
          >
            <Delete />
          </IconButton>
        </Stack>
      ) : (
        <IconButton aria-label="Open item controls" onClick={openControls}>
          <MoreHoriz />
        </IconButton>
      )}

      {!isDesktop && (
        <Dialog
          open={isControlsOpen}
          onClose={() => setIsControlsOpen(false)}
          fullWidth
          maxWidth="xs"
          aria-labelledby="item-controls-title"
        >
          <DialogTitle id="item-controls-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap sx={{ minWidth: 0, flex: 1 }}>
              {product?.name ?? 'Unknown product'}
            </Typography>
            <IconButton aria-label="Close controls" onClick={() => setIsControlsOpen(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} alignItems="stretch">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {`Quantity: ${item.quantity} ${packagingLabel}`}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <IconButton
                  aria-label={`Switch to ${item.is_carton ? 'unit' : 'carton'} packaging`}
                  color={item.is_carton ? 'primary' : 'default'}
                  onClick={onToggleCarton}
                  sx={{
                    boxShadow: item.is_carton
                      ? (dialogTheme) => `0 0 0 8px ${alpha(dialogTheme.palette.primary.main, 0.15)}`
                      : 'none',
                  }}
                >
                  <Inventory2 />
                </IconButton>
                <IconButton aria-label="Decrease quantity" color="primary" onClick={onDecrementQuantity}>
                  <Remove />
                </IconButton>
                <IconButton aria-label="Increase quantity" color="primary" onClick={onIncrementQuantity}>
                  <Add />
                </IconButton>
                <IconButton color="error" onClick={() => setIsConfirmOpen(true)} aria-label="Delete item">
                  <Delete />
                </IconButton>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

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
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
