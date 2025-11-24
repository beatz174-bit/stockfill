import { Add, Close, Delete, Inventory2, Remove } from '@mui/icons-material';
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
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type React from 'react';
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
  const theme = useTheme();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const packagingLabel = item.is_carton
    ? product?.bulk_name ?? 'Carton'
    : product?.unit_type ?? 'Unit';

  const toggleStatus = (checked: boolean) => {
    onStatusChange(checked ? 'picked' : 'pending');
  };

  const closeDialogs = () => {
    setIsConfirmOpen(false);
    setIsControlsOpen(false);
  };

  const handleConfirmDelete = () => {
    onDelete();
    closeDialogs();
  };

  const handleRowClick = () => {
    if (isNarrowScreen) {
      setIsControlsOpen(true);
    }
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isNarrowScreen) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsControlsOpen(true);
    }
  };

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 1,
        cursor: isNarrowScreen ? 'pointer' : 'default',
      }}
      onClick={handleRowClick}
      role={isNarrowScreen ? 'button' : undefined}
      tabIndex={isNarrowScreen ? 0 : undefined}
      onKeyDown={handleRowKeyDown}
    >
      <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
        <Checkbox
          edge="start"
          checked={item.status === 'picked'}
          onChange={(event) => toggleStatus(event.target.checked)}
          inputProps={{ 'aria-label': 'Toggle picked status' }}
          onClick={(event) => event.stopPropagation()}
        />
        <Stack spacing={0.5} minWidth={0} flex={1}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Typography
              component="span"
              variant="subtitle1"
              noWrap
              sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {product?.name ?? 'Unknown product'}
            </Typography>
            <Typography
              component="span"
              variant="subtitle1"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {item.quantity} {packagingLabel}
            </Typography>
          </Typography>
          {isNarrowScreen && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Tap to adjust quantity and packaging
            </Typography>
          )}
        </Stack>
      </Stack>

      {!isNarrowScreen && (
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            aria-label={`Switch to ${item.is_carton ? 'unit' : 'carton'} packaging`}
            color={item.is_carton ? 'primary' : 'default'}
            onClick={(event) => {
              stopPropagation(event);
              onToggleCarton();
            }}
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
            onClick={(event) => {
              stopPropagation(event);
              onDecrementQuantity();
            }}
          >
            <Remove />
          </IconButton>
          <IconButton
            aria-label="Increase quantity"
            color="primary"
            onClick={(event) => {
              stopPropagation(event);
              onIncrementQuantity();
            }}
          >
            <Add />
          </IconButton>
          <IconButton
            color="error"
            onClick={(event) => {
              stopPropagation(event);
              setIsConfirmOpen(true);
            }}
            aria-label="Delete item"
          >
            <Delete />
          </IconButton>
        </Stack>
      )}

      {isNarrowScreen && (
        <Dialog
          open={isControlsOpen}
          onClose={() => setIsControlsOpen(false)}
          fullWidth
          maxWidth="xs"
          aria-labelledby="item-controls-title"
        >
          <DialogTitle
            id="item-controls-title"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="h6" noWrap sx={{ minWidth: 0, flex: 1 }}>
              {product?.name ?? 'Unknown product'}
            </Typography>
            <IconButton
              aria-label="Close controls"
              onClick={(event) => {
                stopPropagation(event);
                setIsControlsOpen(false);
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} alignItems="stretch">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Quantity: {item.quantity} {packagingLabel}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <IconButton
                  aria-label={`Switch to ${item.is_carton ? 'unit' : 'carton'} packaging`}
                  color={item.is_carton ? 'primary' : 'default'}
                  onClick={(event) => {
                    stopPropagation(event);
                    onToggleCarton();
                  }}
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
                  onClick={(event) => {
                    stopPropagation(event);
                    onDecrementQuantity();
                  }}
                >
                  <Remove />
                </IconButton>
                <IconButton
                  aria-label="Increase quantity"
                  color="primary"
                  onClick={(event) => {
                    stopPropagation(event);
                    onIncrementQuantity();
                  }}
                >
                  <Add />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={(event) => {
                    stopPropagation(event);
                    setIsConfirmOpen(true);
                  }}
                  aria-label="Delete item"
                >
                  <Delete />
                </IconButton>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={isConfirmOpen}
        onClose={closeDialogs}
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
          <Button onClick={closeDialogs} autoFocus>
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
