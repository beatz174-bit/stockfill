import {
  Alert,
  AlertColor,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProductRow } from '../components/ProductRow';
import { useCategories, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';
import { BarcodeScannerView } from '../components/BarcodeScannerView';
import { ExternalProductInfo, fetchProductFromOFF } from '../modules/openFoodFacts';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE, Product } from '../models/Product';

export const ManageProductsScreen = () => {
  const db = useDatabase();
  const products = useProducts();
  const categories = useCategories();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'offline'>(
    'idle',
  );
  const [externalProduct, setExternalProduct] = useState<ExternalProductInfo | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; severity: AlertColor } | null>(null);

  const lookupBarcode = useCallback(async (code: string) => {
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
        setName((prev) => prev || result.name || '');
      }
    } else {
      setExternalProduct(null);
      setLookupStatus('notfound');
    }
  }, []);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories.map((item) => item.name);
    const productCategories = products.map((product) => product.category);
    return Array.from(new Set([...categoryNames, ...productCategories]));
  }, [categories, products]);

  const findBarcodeConflict = useCallback(
    (value?: string, productId?: string) =>
      value
        ? products.find((product) => product.barcode === value && product.id !== productId)
        : undefined,
    [products],
  );

  const assertUniqueBarcode = useCallback(
    async (value?: string, productId?: string) => {
      if (!value) return;

      const conflict =
        findBarcodeConflict(value, productId) ?? (await db.products.where('barcode').equals(value).first());

      if (conflict && conflict.id !== productId) {
        const error = new Error('This barcode is already assigned to another product.');
        error.name = 'DuplicateBarcodeError';
        throw error;
      }
    },
    [db.products, findBarcodeConflict],
  );

  const addProductToAutoLists = useCallback(
    async (product: Product, timestamp: number) => {
      const pickLists = await db.pickLists.toArray();
      const eligibleLists = pickLists.filter(
        (pickList) =>
          pickList.auto_add_new_products && Array.isArray(pickList.categories)
            ? pickList.categories.includes(product.category)
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
    [db.pickItems, db.pickLists],
  );

  useEffect(() => {
    if (categoryOptions.length === 0) return;
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0]);
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categoryOptions, selectedCategory]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesSearch = `${p.name} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [products, search, selectedCategory],
  );

  const sortedFiltered = useMemo(
    () => filtered.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    [filtered],
  );

  useEffect(() => {
    const state = location.state as { newBarcode?: string } | null;
    if (state?.newBarcode) {
      setBarcode(state.newBarcode);
      void lookupBarcode(state.newBarcode);
    }
  }, [location.state, lookupBarcode]);

  useEffect(() => {
    if (!barcode) {
      setLookupStatus('idle');
      setExternalProduct(null);
    }
    setBarcodeError('');
  }, [barcode]);

  const addProduct = async () => {
    if (!name || !category) return;

    try {
      await assertUniqueBarcode(barcode || undefined);
    } catch (error) {
      if (error instanceof Error && error.name === 'DuplicateBarcodeError') {
        setBarcodeError(error.message);
        return;
      }
      throw error;
    }
    const timestamp = Date.now();
    const productId = uuidv4();
    const newProduct: Product = {
      id: productId,
      name,
      category,
      unit_type: DEFAULT_UNIT_TYPE,
      bulk_name: DEFAULT_BULK_NAME,
      barcode: barcode || undefined,
      archived: false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    await db.transaction('rw', db.products, db.pickLists, db.pickItems, async () => {
      await db.products.add(newProduct);
      await addProductToAutoLists(newProduct, timestamp);
    });
    setName('');
    setBarcode('');
    setFeedback({ text: 'Product added.', severity: 'success' });
  };

  const updateProduct = async (
    productId: string,
    updates: {
      name: string;
      category: string;
      barcode?: string;
    },
  ) => {
    await assertUniqueBarcode(updates.barcode, productId);

    await db.products.update(productId, {
      ...updates,
      unit_type: DEFAULT_UNIT_TYPE,
      bulk_name: DEFAULT_BULK_NAME,
      updated_at: Date.now(),
    });
    setFeedback({ text: 'Product updated.', severity: 'success' });
  };

  const deleteProduct = async (productId: string) => {
    const usageCount = await db.pickItems.where('product_id').equals(productId).count();
    if (usageCount > 0) {
      setFeedback({
        text: `Cannot delete this product while ${usageCount} pick item(s) reference it. Remove those items first.`,
        severity: 'error',
      });
      return;
    }
    await db.products.delete(productId);
    setFeedback({ text: 'Product deleted.', severity: 'success' });
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Products
      </Typography>
      <Stack spacing={2}>
        {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : null}
        <Button component={RouterLink} to="/categories" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Edit Categories
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">{<SearchIcon />}</InputAdornment> }}
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            sx={{ minWidth: { sm: 180 } }}
          >
            <MenuItem value="all">All categories</MenuItem>
            {categoryOptions.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Add Product</Typography>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            InputProps={
              name
                ? {
                    endAdornment: (
                      <Button onClick={() => setName('')} size="small">
                        Clear
                      </Button>
                    ),
                  }
                : undefined
            }
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={categoryOptions.length === 0}
          >
            {categoryOptions.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          {barcode ? (
            <Stack spacing={1}>
              <TextField
                label="Barcode"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                error={Boolean(barcodeError)}
                helperText={barcodeError || undefined}
                InputProps={{
                  endAdornment: (
                    <Button onClick={() => setBarcode('')} size="small">
                      Clear
                    </Button>
                  ),
                }}
              />
              {lookupStatus === 'loading' ? <Typography variant="body2">Looking up product…</Typography> : null}
              {lookupStatus === 'found' && externalProduct ? (
                <Typography variant="body2" color="text.secondary">
                  Found {externalProduct.name ?? 'product'} via Open Food Facts. Please confirm details.
                </Typography>
              ) : null}
              {lookupStatus === 'notfound' ? (
                <Typography variant="body2" color="text.secondary">
                  Product not found. Add it manually.
                </Typography>
              ) : null}
              {lookupStatus === 'offline' ? (
                <Typography variant="body2" color="text.secondary">
                  You are offline. Enter details manually.
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Button variant="outlined" onClick={() => setScannerOpen(true)}>
              Scan Barcode
            </Button>
          )}
          <Button variant="contained" onClick={addProduct} disabled={!name || !category}>
            Save Product
          </Button>
        </Stack>
        {sortedFiltered.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            categories={categoryOptions}
            onSave={updateProduct}
            onDelete={deleteProduct}
          />
        ))}
      </Stack>
      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} fullWidth>
        <DialogTitle>Scan Barcode</DialogTitle>
        <DialogContent>
          <BarcodeScannerView
            onDetected={(code) => {
              setBarcode(code);
              void lookupBarcode(code);
              setScannerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};
