import {
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Button,
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
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setFormState(getInitialFormState(product));
    setSaveError('');
  }, [product]);

  const handleChange = (field: keyof ProductFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    setSaveError('');
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
      setSaveError('');
    } catch (error) {
      if (error instanceof Error && error.name === 'DuplicateBarcodeError') {
        setSaveError('This barcode is already assigned to another product.');
        return;
      }
      throw error;
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormState(getInitialFormState(product));
    setSaveError('');
  };

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent>
        {isEditing ? (
          <Stack spacing={1}>
            <TextField label="Name" value={formState.name} onChange={handleChange('name')} size="small" />
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
                error={Boolean(saveError)}
                helperText={saveError || undefined}
                InputProps={{
                  endAdornment: (
                    <Button
                      size="small"
                      onClick={() => {
                        setFormState((prev) => ({ ...prev, barcode: '' }));
                        setSaveError('');
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
          </Stack>
        ) : (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <div>
              <Typography variant="subtitle1">{product.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {product.category}
              </Typography>
            </div>
            {product.barcode ? (
              <Typography variant="caption" color="text.secondary">
                Barcode: {product.barcode}
              </Typography>
            ) : null}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        {isEditing ? (
          <>
            <IconButton aria-label="Save product" onClick={handleSave} disabled={!formState.name} color="primary">
              <CheckIcon />
            </IconButton>
            <IconButton aria-label="Cancel edit" onClick={handleCancel}>
              <CloseIcon />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton aria-label={`Edit ${product.name}`} onClick={() => setIsEditing(true)}>
              <EditIcon />
            </IconButton>
            <IconButton aria-label={`Delete ${product.name}`} onClick={() => onDelete(product.id)}>
              <DeleteIcon />
            </IconButton>
          </>
        )}
      </CardActions>
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
