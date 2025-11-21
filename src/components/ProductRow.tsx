import {
  Card,
  CardActions,
  CardContent,
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

interface ProductRowProps {
  product: Product;
  categories: string[];
  onSave: (
    productId: string,
    updates: {
      name: string;
      category: string;
      unit_type: string;
      bulk_name?: string;
      units_per_bulk?: number;
    },
  ) => Promise<void> | void;
  onDelete: (productId: string) => Promise<void> | void;
}

interface ProductFormState {
  name: string;
  category: string;
  unitType: string;
  bulkName: string;
  unitsPerBulk: string;
}

const getInitialFormState = (product: Product): ProductFormState => ({
  name: product.name,
  category: product.category,
  unitType: product.unit_type,
  bulkName: product.bulk_name ?? '',
  unitsPerBulk: product.units_per_bulk?.toString() ?? '',
});

export const ProductRow = ({ product, categories, onSave, onDelete }: ProductRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(() => getInitialFormState(product));

  useEffect(() => {
    setFormState(getInitialFormState(product));
  }, [product]);

  const handleChange = (field: keyof ProductFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!formState.name) return;
    await onSave(product.id, {
      name: formState.name,
      category: formState.category,
      unit_type: formState.unitType,
      bulk_name: formState.bulkName || undefined,
      units_per_bulk: formState.unitsPerBulk ? Number(formState.unitsPerBulk) : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormState(getInitialFormState(product));
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
            <Stack direction="row" spacing={1}>
              <TextField
                label="Unit Type"
                value={formState.unitType}
                onChange={handleChange('unitType')}
                size="small"
                fullWidth
              />
              <TextField
                label="Units per Bulk"
                type="number"
                value={formState.unitsPerBulk}
                onChange={handleChange('unitsPerBulk')}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Bulk Name"
              value={formState.bulkName}
              onChange={handleChange('bulkName')}
              size="small"
            />
          </Stack>
        ) : (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <div>
              <Typography variant="subtitle1">{product.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {product.category} • {product.unit_type}
              </Typography>
            </div>
            {product.bulk_name && product.units_per_bulk ? (
              <Typography variant="caption" color="text.secondary">
                {product.units_per_bulk} per {product.bulk_name}
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
    </Card>
  );
};
