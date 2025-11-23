import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { ChangeEvent, useEffect, useState } from 'react';
import { Product } from '../models/Product';
import { BarcodeScannerView } from './BarcodeScannerView';

interface ProductRowProps {
  product: Product;
  categories: string[];
  onSave: (
    productId: string,
    updates: {
      name: string;
      category: string;
      barcode?: string;
    },
  ) => Promise<void> | void;
  onDelete: (productId: string) => Promise<void> | void;
}

interface ProductFormState {
  name: string;
  category: string;
  barcode: string;
}

const getInitialFormState = (product: Product): ProductFormState => ({
  name: product.name,
  category: product.category,
  barcode: product.barcode ?? '',
});

export const ProductRow = ({ product, categories, onSave, onDelete }: ProductRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(() => getInitialFormState(product));
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; barcode?: string }>({});

  useEffect(() => {
    setFormState(getInitialFormState(product));
    setFieldErrors({});
  }, [product]);

  const handleChange = (field: keyof ProductFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    if (!formState.name) return;
    try {
      await onSave(product.id, {
        name: formState.name,
        category: formState.category,
        barcode: formState.barcode || undefined,
      });
      setIsEditing(false);
      setFieldErrors({});
    } catch (error) {
      if (error instanceof Error && error.name === 'DuplicateNameError') {
        setFieldErrors({ name: 'A product with this name already exists.' });
        return;
      }
      if (error instanceof Error && error.name === 'DuplicateBarcodeError') {
        setFieldErrors({ barcode: 'This barcode is already assigned to another product.' });
        return;
      }
      throw error;
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormState(getInitialFormState(product));
    setFieldErrors({});
  };

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        {isEditing ? (
          <Stack spacing={1}>
            <TextField
              label="Name"
              value={formState.name}
              onChange={handleChange('name')}
              size="small"
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name || undefined}
            />
            <TextField
              select
              label="Category"
              value={formState.category}
              onChange={handleChange('category')}
              size="small"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            {formState.barcode ? (
              <TextField
                label="Barcode"
                value={formState.barcode}
                onChange={handleChange('barcode')}
                size="small"
                error={Boolean(fieldErrors.barcode)}
                helperText={fieldErrors.barcode || undefined}
                InputProps={{
                  endAdornment: (
                    <Button
                      size="small"
                      onClick={() => {
                        setFormState((prev) => ({ ...prev, barcode: '' }));
                        setFieldErrors((prev) => ({ ...prev, barcode: undefined }));
                      }}
                    >
                      Clear
                    </Button>
                  ),
                }}
              />
            ) : (
              <Button variant="outlined" onClick={() => setIsScannerOpen(true)}>
                Scan Barcode
              </Button>
            )}
            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
              <IconButton
                aria-label={`Delete ${product.name}`}
                onClick={() => onDelete(product.id)}
                size="small"
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label="Save product" onClick={handleSave} disabled={!formState.name} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton aria-label="Cancel edit" onClick={handleCancel}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>
                  {product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {product.category} • {product.unit_type || DEFAULT_UNIT_TYPE}
                </Typography>
              </Stack>
              {product.barcode ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  Barcode: {product.barcode}
                </Typography>
              ) : null}
            </Stack>
            <Box display="flex" alignItems="center" gap={0.5} sx={{ ml: 1 }}>
              <IconButton aria-label={`Edit ${product.name}`} onClick={() => setIsEditing(true)} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton aria-label={`Delete ${product.name}`} onClick={() => onDelete(product.id)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Stack>
        )}
      </CardContent>
      <Dialog open={isScannerOpen} onClose={() => setIsScannerOpen(false)} fullWidth>
        <DialogTitle>Scan Barcode</DialogTitle>
        <DialogContent>
          <BarcodeScannerView
            onDetected={(code) => {
              setFormState((prev) => ({ ...prev, barcode: code }));
              setIsScannerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
