// src/components/AddProductDialog.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertColor,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { v4 as uuidv4 } from 'uuid';
import { useDatabase } from '../context/DBProvider';
import { BarcodeScannerView } from './BarcodeScannerView';
import { ExternalProductInfo, fetchProductFromOFF } from '../modules/openFoodFacts';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE, Product } from '../models/Product';

export type AddProductDialogProps = {
  open: boolean;
  onClose: () => void;
  categoryOptions: string[];
  onFeedback?: (feedback: { text: string; severity: AlertColor }) => void;
  initialBarcode?: string | null;
};

export const AddProductDialog = ({
  open,
  onClose,
  categoryOptions,
  onFeedback,
  initialBarcode,
}: AddProductDialogProps) => {
  const db = useDatabase();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [nameError, setNameError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'offline'>('idle');
  const [externalProduct, setExternalProduct] = useState<ExternalProductInfo | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setCategory('');
    setBarcode('');
    setBarcodeError('');
    setNameError('');
    setLookupStatus('idle');
    setExternalProduct(null);
    setScannerOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (categoryOptions.length > 0 && !categoryOptions.includes(category)) {
        setCategory(categoryOptions[0]);
      }
      if (initialBarcode) {
        setBarcode(initialBarcode);
        void lookupBarcode(initialBarcode);
      }
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryOptions, initialBarcode]);

  useEffect(() => {
    if (!barcode) {
      setLookupStatus('idle');
      setExternalProduct(null);
    }
    setBarcodeError('');
  }, [barcode]);

  const categoryMap = useMemo(() => new Map(categoryOptions.map((c) => [c, c])), [categoryOptions]);

  const findBarcodeConflict = useCallback(
    async (value?: string) => {
      if (!value) return undefined;
      const conflict = await db.products.where('barcode').equals(value).first();
      return conflict ?? undefined;
    },
    [db.products],
  );

  const findNameConflict = useCallback(
    async (value?: string) => {
      if (!value) return undefined;
      const normalizedValue = value.trim().toLowerCase();
      const conflict = await db.products.filter((product) => product.name.trim().toLowerCase() === normalizedValue).first();
      return conflict ?? undefined;
    },
    [db.products],
  );

  const assertUniqueBarcode = useCallback(
    async (value?: string) => {
      if (!value) return;
      const conflict = await findBarcodeConflict(value);
      if (conflict) {
        const error = new Error('This barcode is already assigned to another product.');
        error.name = 'DuplicateBarcodeError';
        throw error;
      }
    },
    [findBarcodeConflict],
  );

  const assertUniqueName = useCallback(
    async (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return;
      const conflict = await findNameConflict(value);
      if (conflict) {
        const error = new Error('A product with this name already exists.');
        error.name = 'DuplicateNameError';
        throw error;
      }
    },
    [findNameConflict],
  );

  const addProductToAutoLists = useCallback(
    async (product: Product, timestamp: number) => {
      const pickLists = await db.pickLists.toArray();
      const categoriesAll = await db.categories.toArray();
      const categoriesByName = new Map(categoriesAll.map((c) => [c.name, c.id]));

      const eligibleLists = pickLists.filter((pickList) =>
        pickList.auto_add_new_products && Array.isArray(pickList.categories)
          ? pickList.categories.some((catRef: string) => {
              if (catRef === product.category) return true;
              const resolvedId = categoriesByName.get(catRef);
              return resolvedId === product.category;
            })
          : false,
      );

      if (eligibleLists.length === 0) return;
      await Promise.all(
        eligibleLists.map(async (pickList) => {
          const existing = await db.pickItems
            .where('pick_list_id')
            .equals(pickList.id)
            .filter((item) => item.product_id === product.id)
            .first();
          if (existing) return undefined;
          return db.pickItems.add({
            id: uuidv4(),
            pick_list_id: pickList.id,
            product_id: product.id,
            quantity: 1,
            is_carton: false,
            status: 'pending',
            created_at: timestamp,
            updated_at: timestamp,
          });
        }),
      );
    },
    [db.pickItems, db.pickLists, db.categories],
  );

  async function lookupBarcode(code: string) {
    if (!code) return;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      setLookupStatus('offline');
      setExternalProduct(null);
      return;
    }
    setLookupStatus('loading');
    const result = await fetchProductFromOFF(code);
    if (result) {
      setExternalProduct(result);
      setLookupStatus('found');
      if (result.name) {
        setName(result.name || '');
      }
    } else {
      setExternalProduct(null);
      setLookupStatus('notfound');
    }
  }

  const handleSubmit = async () => {
    setNameError('');
    setBarcodeError('');

    if (!name || !category) {
      onFeedback?.({ text: 'Name and category are required.', severity: 'error' });
      return;
    }

    const timestamp = Date.now();
    const productId = uuidv4();

    try {
      await assertUniqueName(name);
      await assertUniqueBarcode(barcode);

      await db.transaction('rw', db.categories, db.products, db.pickLists, db.pickItems, async () => {
        let categoryIdToSave: string;
        const existingCategory = await db.categories.where('name').equals(category).first();
        if (existingCategory) {
          categoryIdToSave = existingCategory.id;
        } else {
          const newCatId = uuidv4();
          const now = Date.now();
          await db.categories.add({ id: newCatId, name: category, created_at: now, updated_at: now });
          categoryIdToSave = newCatId;
        }

        const newProduct: Product = {
          id: productId,
          name: name.trim(),
          category: categoryIdToSave,
          unit_type: DEFAULT_UNIT_TYPE,
          bulk_name: DEFAULT_BULK_NAME,
          barcode: barcode || undefined,
          archived: false,
          created_at: timestamp,
          updated_at: timestamp,
        };

        await db.products.add(newProduct);
        await addProductToAutoLists(newProduct, timestamp);
      });

      onFeedback?.({ text: 'Product added.', severity: 'success' });
      resetForm();
      onClose();
    } catch (err: any) {
      if (err?.name === 'DuplicateNameError') {
        setNameError(err.message || 'A product with this name already exists.');
        return;
      }
      if (err?.name === 'DuplicateBarcodeError') {
        setBarcodeError(err.message || 'This barcode is already assigned to another product.');
        return;
      }
      onFeedback?.({ text: `Failed to add product: ${err?.message ?? String(err)}`, severity: 'error' });
    }
  };

  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} aria-label="Add product dialog" fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Add product
        <IconButton
          aria-label="Close add product"
          onClick={handleDialogClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!nameError}
            helperText={nameError || ' '}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            data-testid="select-add-product-category"
          />

          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} select fullWidth>
            {categoryOptions.map((opt) => (
              <MenuItem key={opt} value={categoryMap.get(opt) ?? opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              inputProps={{ 'data-testid': 'product-barcode-input' }}
              error={!!barcodeError}
              helperText={barcodeError || ' '}
              fullWidth
            />
            <Button onClick={() => setScannerOpen(true)}>Scan barcode</Button>
          </Stack>

          {lookupStatus === 'offline' ? (
            <Alert severity="warning" data-testid="barcode-offline">
              You are offline. Enter details manually.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleDialogClose} variant="outlined">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!name || !category}>
              Save product
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} aria-label="Scan barcode">
        <DialogTitle>Scan barcode</DialogTitle>
        <DialogContent>
          <BarcodeScannerView
            onDetected={async (code) => {
              setScannerOpen(false);
              setBarcode(code);
              try {
                await lookupBarcode(code);
              } catch {
                // lookupBarcode handles errors
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AddProductDialog;
