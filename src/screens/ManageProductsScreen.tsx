// src/screens/ManageProductsScreen.tsx
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
  Snackbar,
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

const ManageProductsScreen = () => {
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
  const [nameError, setNameError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'offline'>('idle');
  const [externalProduct, setExternalProduct] = useState<ExternalProductInfo | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; severity: AlertColor } | null>(null);

  // Map category id -> name
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // category options are display names (union of known category names and product-resolved names)
  const categoryOptions = useMemo(() => {
    const categoryNames = categories.map((item) => item.name);
    const productCategories = products.map((product) => categoriesById.get(product.category) ?? product.category ?? '');
    return Array.from(new Set([...categoryNames, ...productCategories].filter(Boolean)));
  }, [categories, products, categoriesById]);

  const findBarcodeConflict = useCallback(
    (value?: string, productId?: string) =>
      value ? products.find((product) => product.barcode === value && product.id !== productId) : undefined,
    [products],
  );

  const findNameConflict = useCallback(
    (value?: string, productId?: string) => {
      if (!value) return undefined;
      const normalizedValue = value.trim().toLowerCase();
      return products.find((product) => product.id !== productId && product.name.trim().toLowerCase() === normalizedValue);
    },
    [products],
  );

  const assertUniqueBarcode = useCallback(
    async (value?: string, productId?: string) => {
      if (!value) return;
      const conflict = findBarcodeConflict(value, productId) ?? (await db.products.where('barcode').equals(value).first());
      if (conflict && conflict.id !== productId) {
        const error = new Error('This barcode is already assigned to another product.');
        error.name = 'DuplicateBarcodeError';
        throw error;
      }
    },
    [db.products, findBarcodeConflict],
  );

  const assertUniqueName = useCallback(
    async (value: string, productId?: string) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return;
      const conflict = findNameConflict(value, productId);
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
              // catRef can be an id or a name — resolve both
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
        const pCategoryName = categoriesById.get(p.category) ?? p.category ?? '';
        const matchesSearch = `${p.name} ${pCategoryName}`.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || pCategoryName === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [products, search, selectedCategory, categoriesById],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!barcode) {
      setLookupStatus('idle');
      setExternalProduct(null);
    }
    setBarcodeError('');
  }, [barcode]);

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
      // TEST-FRIENDLY CHANGE: always set the name when a result is found
      if (result.name) {
        setName(result.name || '');
      }
    } else {
      setExternalProduct(null);
      setLookupStatus('notfound');
    }
  }

  const addProduct = async () => {
    setNameError('');
    setBarcodeError('');

    if (!name || !category) {
      setFeedback({ text: 'Name and category are required.', severity: 'error' });
      return;
    }

    const timestamp = Date.now();
    const productId = uuidv4();

    try {
      await assertUniqueName(name);
      await assertUniqueBarcode(barcode);

      await db.transaction(
        'rw',
        db.categories,
        db.products,
        db.pickLists,
        db.pickItems,
        async () => {
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
        },
      );

      setName('');
      setBarcode('');
      setNameError('');
      setBarcodeError('');
      setFeedback({ text: 'Product added.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to add product', err);
      if (err?.name === 'DuplicateNameError') {
        setNameError(err.message || 'A product with this name already exists.');
        return;
      }
      if (err?.name === 'DuplicateBarcodeError') {
        setBarcodeError(err.message || 'This barcode is already assigned to another product.');
        return;
      }
      setFeedback({ text: `Failed to add product: ${err?.message ?? String(err)}`, severity: 'error' });
    }
  };

  const updateProduct = async (
    productId: string,
    updates: {
      name: string;
      category: string;
      barcode?: string;
    },
  ) => {
    setNameError('');
    setBarcodeError('');

    try {
      await assertUniqueName(updates.name, productId);
      await assertUniqueBarcode(updates.barcode, productId);

      const existing = await db.products.get(productId);
      if (!existing) return;

      const normalizedName = updates.name.trim();
      const oldNameKey = existing.name.trim().toLowerCase();

      await db.transaction(
        'rw',
        db.categories,
        db.products,
        async () => {
          let categoryIdToSave = updates.category;
          const matchingCategory = await db.categories.where('name').equals(updates.category).first();
          if (matchingCategory) {
            categoryIdToSave = matchingCategory.id;
          } else {
            const isExistingId = await db.categories.get(updates.category);
            if (!isExistingId) {
              const newCatId = uuidv4();
              const now = Date.now();
              await db.categories.add({ id: newCatId, name: updates.category, created_at: now, updated_at: now });
              categoryIdToSave = newCatId;
            } else {
              categoryIdToSave = updates.category;
            }
          }

          const updatedProduct: Product = {
            ...existing,
            ...updates,
            name: normalizedName,
            category: categoryIdToSave,
            unit_type: DEFAULT_UNIT_TYPE,
            bulk_name: DEFAULT_BULK_NAME,
            updated_at: Date.now(),
          };

          await db.products.put(updatedProduct);
          await db.products
            .filter((product) => product.id !== productId && product.name.trim().toLowerCase() === oldNameKey)
            .delete();
        },
      );

      setFeedback({ text: 'Product updated.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to update product', err);

      if (err?.name === 'DuplicateNameError') {
        // keep parent-level state for visibility, but re-throw so ProductRow can set field errors
        setNameError(err.message || 'A product with this name already exists.');
        throw err;
      }
      if (err?.name === 'DuplicateBarcodeError') {
        setBarcodeError(err.message || 'This barcode is already assigned to another product.');
        throw err;
      }

      setFeedback({ text: `Failed to update product: ${err?.message ?? String(err)}`, severity: 'error' });
    }
  };

  const deleteProduct = async (productId: string) => {
    const usageCount = await db.pickItems.where('product_id').equals(productId).count();
    if (usageCount > 0) {
      setFeedback({ text: `Cannot delete this product while ${usageCount} pick item(s) reference it`, severity: 'error' });
      return;
    }

    await db.products.delete(productId);
    setFeedback({ text: 'Product deleted.', severity: 'success' });
  };

  // ---------- RENDER ----------
  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2} mb={2}>
        <Typography variant="h5">Manage Products</Typography>

        <Stack spacing={1}>
          <Button component={RouterLink} to="/categories" variant="outlined">
            Edit Categories
          </Button>

          <Stack direction="row" spacing={2}>
            <TextField
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            <TextField
              select
              label="Filter by category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              sx={{ minWidth: 200 }}
              data-testid="select-filter-by-category"
            >
              <MenuItem value="all">All categories</MenuItem>
              {categoryOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!nameError}
            data-testid="select-add-product-category"
          />
          {nameError ? <div data-testid="name-error">{nameError}</div> : null}

          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            select
          >
            {categoryOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
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
            />
            <Button onClick={() => setScannerOpen(true)}>Scan barcode</Button>
          </Stack>

          {barcodeError ? <div data-testid="barcode-error">{barcodeError}</div> : null}

          {lookupStatus === 'offline' ? (
            <Alert severity="warning" data-testid="barcode-offline">
              You are offline. Enter details manually.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={addProduct} disabled={!name || !category}>
              Save product
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <div>
        {sortedFiltered.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            categories={categoryOptions}
            categoriesById={categoriesById}
            onDelete={deleteProduct}
            onSave={updateProduct}
          />
        ))}
      </div>

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

      <Snackbar open={!!feedback} autoHideDuration={3000} onClose={() => setFeedback(null)}>
        {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : undefined}
      </Snackbar>
    </Container>
  );
};

export default ManageProductsScreen;
