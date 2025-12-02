// src/screens/ManageProductsScreen.tsx
import {
  Alert,
  AlertColor,
  Button,
  Container,
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
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE, Product } from '../models/Product';
import { AddProductDialog } from '../components/AddProductDialog';

const ManageProductsScreen = () => {
  const db = useDatabase();
  const products = useProducts();
  const categories = useCategories();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ text: string; severity: AlertColor } | null>(null);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

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
      setPendingBarcode(state.newBarcode);
      setAddProductDialogOpen(true);
    }
  }, [location.state]);

  const updateProduct = async (
    productId: string,
    updates: {
      name: string;
      category: string;
      barcode?: string;
    },
  ) => {
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
    } catch (err: unknown) {
      console.error('Failed to update product', err);

      if (err instanceof Error && (err.name === 'DuplicateNameError' || err.name === 'DuplicateBarcodeError')) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      setFeedback({ text: `Failed to update product: ${message}`, severity: 'error' });
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

  const handleAddProductClose = () => {
    setAddProductDialogOpen(false);
    setPendingBarcode(null);
  };

  // ---------- RENDER ----------
  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2} mb={2}>
        <Typography variant="h5">Manage Products</Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Button component={RouterLink} to="/categories" variant="outlined">
            Edit Categories
          </Button>
          <Button
            variant="contained"
            onClick={() => setAddProductDialogOpen(true)}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            Add product
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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

      <AddProductDialog
        open={addProductDialogOpen}
        onClose={handleAddProductClose}
        categoryOptions={categoryOptions}
        onFeedback={setFeedback}
        initialBarcode={pendingBarcode}
      />

      <Snackbar open={!!feedback} autoHideDuration={3000} onClose={() => setFeedback(null)}>
        {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : undefined}
      </Snackbar>
    </Container>
  );
};

export default ManageProductsScreen;
