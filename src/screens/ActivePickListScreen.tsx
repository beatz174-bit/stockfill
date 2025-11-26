// src/screens/ActivePickListScreen.tsx
import {
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  useAreas,
  useCategories,
  usePickItems,
  usePickList,
  useProducts,
} from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';
import { PickItemRow } from '../components/PickItemRow';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';
import { ProductAutocomplete } from '../components/ProductAutocomplete';

const normalizeName = (name: string) => name.trim().toLowerCase();

const ActivePickListScreen = () => {
  const { id } = useParams();
  const pickList = usePickList(id);
  const items = usePickItems(id);
  const products = useProducts();
  const areas = useAreas();
  const categoriesList = useCategories();
  const db = useDatabase();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [showPicked, setShowPicked] = useState(true);
  const [itemState, setItemState] = useState<PickItem[]>(items ?? []);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [packagingFilter, setPackagingFilter] = useState<'all' | 'units' | 'cartons'>('all');

  // NEW: search within the list and category filter for the visible list
  const [listSearch, setListSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  // Keep local item state in sync with DB-driven `items`
  useEffect(() => {
    setItemState((current: PickItem[]) => {
      const currentById = new Map<string, PickItem>(current.map((item: PickItem) => [item.id, item]));
      return (items ?? []).map((incoming: PickItem) => {
        const local = currentById.get(incoming.id);
        if (!local) return incoming;

        const localUpdatedAt = local.updated_at ?? 0;
        const incomingUpdatedAt = incoming.updated_at ?? 0;

        if (localUpdatedAt > incomingUpdatedAt) {
          return local;
        }

        return incoming;
      });
    });
  }, [items]);

  // Reworked visible logic:
  const itemsAfterShowPicked = useMemo(
    () => (showPicked ? itemState : itemState.filter((item) => item.status !== 'picked')),
    [itemState, showPicked],
  );

  const packagingInfo = useMemo(() => {
    const visible = itemsAfterShowPicked ?? [];
    const uniqueValues = new Set(visible.map((it) => !!it.is_carton));
    return {
      visibleCount: visible.length,
      uniquePackagingCount: uniqueValues.size,
    };
  }, [itemsAfterShowPicked]);

  useEffect(() => {
    if (packagingInfo.visibleCount === 0 || packagingInfo.uniquePackagingCount === 1) {
      setPackagingFilter('all');
    }
  }, [packagingInfo.visibleCount, packagingInfo.uniquePackagingCount]);

  const allItemsPicked = useMemo(
    () => itemState.length > 0 && itemState.every((item) => item.status === 'picked'),
    [itemState],
  );

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product: Product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const areaName = useMemo(
    () => areas.find((area) => area.id === pickList?.area_id)?.name ?? 'Area',
    [areas, pickList?.area_id],
  );

  const sortedProducts = useMemo(() => {
    const dedupedById = new Map<string, Product>();

    products.forEach((product: Product) => {
      const existing = dedupedById.get(product.id);
      if (!existing || product.updated_at > existing.updated_at) {
        dedupedById.set(product.id, product);
      }
    });

    const dedupedByName = new Map<string, Product>();

    dedupedById.forEach((product: Product) => {
      const normalizedName = product.name.trim().toLowerCase();
      const existing = dedupedByName.get(normalizedName);

      if (!existing || product.updated_at > existing.updated_at) {
        dedupedByName.set(normalizedName, product);
      }
    });

    return Array.from(dedupedByName.values()).sort((a, b) => {
      const normalizedNameA = normalizeName(a.name);
      const normalizedNameB = normalizeName(b.name);

      const nameComparison = normalizedNameA.localeCompare(normalizedNameB, undefined, {
        sensitivity: 'base',
      });

      if (nameComparison !== 0) {
        return nameComparison;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [products]);

  // Build a category id -> name map for display and name -> id map for resolution
  const categoriesById = useMemo(() => new Map(categoriesList.map((c) => [c.id, c.name])), [categoriesList]);
  const categoryNameToId = useMemo(() => new Map(categoriesList.map((c) => [c.name.trim().toLowerCase(), c.id])), [categoriesList]);

  // Filter products by pickList.categories (now stored as ids). Fallback: resolve name -> id
  const categoryFilteredProducts = useMemo(() => {
    if (!pickList?.categories || pickList.categories.length === 0) {
      return sortedProducts;
    }

    const categoryIdsKnown = new Set(categoriesList.map((c) => c.id));
    const allowedCategoryIds = new Set<string>();

    pickList.categories.forEach((entry: string) => {
      if (!entry) return;
      if (categoryIdsKnown.has(entry)) {
        // entry already an id
        allowedCategoryIds.add(entry);
      } else {
        // maybe it's a name (legacy) — resolve
        const resolved = categoryNameToId.get(entry.trim().toLowerCase());
        if (resolved) allowedCategoryIds.add(resolved);
      }
    });

    if (allowedCategoryIds.size === 0) return sortedProducts;

    return sortedProducts.filter((product: Product) => allowedCategoryIds.has(product.category));
  }, [pickList?.categories, sortedProducts, categoriesList, categoryNameToId]);

  const productIdsInList = useMemo(() => new Set(itemState.map((item) => item.product_id)), [itemState]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const availableProducts = categoryFilteredProducts.filter((product: Product) => !productIdsInList.has(product.id));

    if (!normalizedQuery) return availableProducts;

    return availableProducts.filter((product: Product) => {
      const catName = categoriesById.get(product.category) ?? product.category ?? '';
      const searchableText = `${product.name} ${catName} ${product.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [categoryFilteredProducts, productIdsInList, query, categoriesById]);

  // If a filtered list leaves a previously-selected product missing, callers (ProductAutocomplete) will handle clear.
  // --- Handlers (restored) ---

  const handleIncrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = existing.quantity + 1;
    setItemState((current) => current.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity, updated_at: Date.now() } : item)));
    await db.pickItems.update(itemId, {
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleDecrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = Math.max(1, (existing.quantity || 1) - 1);
    setItemState((current) => current.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity, updated_at: Date.now() } : item)));
    await db.pickItems.update(itemId, {
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleToggleCarton = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextCartonFlag = !existing.is_carton;
    const nextQuantity = existing.quantity || 1;

    setItemState((current) => current.map((item) => (item.id === itemId ? { ...item, is_carton: nextCartonFlag, quantity: nextQuantity, updated_at: Date.now() } : item)));
    await db.pickItems.update(itemId, {
      is_carton: nextCartonFlag,
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleStatusChange = async (itemId: string, status: PickItem['status']) => {
    const nextStatus = status === 'picked' ? 'picked' : 'pending';
    setItemState((current) => current.map((item) => (item.id === itemId ? { ...item, status: nextStatus, updated_at: Date.now() } : item)));
    await db.pickItems.update(itemId, { status: nextStatus, updated_at: Date.now() });
  };

  const handleDeleteItem = async (itemId: string) => {
    setItemState((current) => current.filter((item) => item.id !== itemId));
    await db.pickItems.delete(itemId);
  };

  const handleMarkAllPicked = async () => {
    if (!id) return;

    setShowPicked(true);
    const timestamp = Date.now();
    setItemState((current) => current.map((item) => ({ ...item, status: 'picked', updated_at: timestamp })));
    setIsBatchUpdating(true);

    // if itemState is empty at invocation, fall back to DB items
    const itemsToUpdate = itemState.length > 0 ? itemState : (items ?? []);

    try {
      await Promise.all(itemsToUpdate.map((item: PickItem) => db.pickItems.update(item.id, { status: 'picked', updated_at: timestamp })));
      const refreshedItems = await db.pickItems.where('pick_list_id').equals(id as string).toArray();
      setItemState(refreshedItems);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const addOrUpdateItem = async (product: Product) => {
    if (!id) return;

    const timestamp = Date.now();
    const existing = itemState.find((item) => item.product_id === product.id && item.is_carton === false);

    if (existing) {
      setItemState((current) =>
        current.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1, updated_at: timestamp }
            : item,
        ),
      );
      await db.pickItems.update(existing.id, {
        quantity: existing.quantity + 1,
        updated_at: timestamp,
      });
    } else {
      const newItem: PickItem = {
        id: uuidv4(),
        pick_list_id: id as string,
        product_id: product.id,
        quantity: 1,
        is_carton: false,
        status: 'pending',
        created_at: timestamp,
        updated_at: timestamp,
      };

      setItemState((current) => [...current, newItem]);
      await db.pickItems.add({
        ...newItem,
      });
    }

    setQuery('');
  };

  const returnToLists = () => {
    navigate('/pick-lists');
  };

  // Sort the items that are actually visible (after showPicked and packaging filter)
  const visibleItems = useMemo(() => {
    let arr = [...itemsAfterShowPicked];

    if (packagingFilter === 'units') {
      arr = arr.filter((item) => !item.is_carton);
    } else if (packagingFilter === 'cartons') {
      arr = arr.filter((item) => item.is_carton);
    }

    arr.sort((a, b) => {
      const nameA = normalizeName(productMap.get(a.product_id)?.name ?? '');
      const nameB = normalizeName(productMap.get(b.product_id)?.name ?? '');
      const nameComparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      if (nameComparison !== 0) return nameComparison;
      const timeA = a.created_at ?? a.updated_at ?? 0;
      const timeB = b.created_at ?? b.updated_at ?? 0;
      return timeA - timeB;
    });
    return arr;
  }, [itemsAfterShowPicked, productMap, packagingFilter]);

  // --- NEW: build category options from pickList.categories (fallback to all categories) ---
  const categoryOptions = useMemo(() => {
    // helper maps
    const idToName = new Map(categoriesList.map((c) => [c.id, c.name]));
    const nameToId = new Map(categoriesList.map((c) => [c.name.trim().toLowerCase(), c.id]));

    if (!pickList?.categories || pickList.categories.length === 0) {
      // fallback: show all categories
      return categoriesList
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    // Build from pickList.categories while resolving legacy names -> ids
    const seen = new Map<string, string>();
    pickList.categories.forEach((entry: string) => {
      if (!entry) return;

      if (idToName.has(entry)) {
        seen.set(entry, idToName.get(entry)!);
      } else {
        const resolved = nameToId.get(entry.trim().toLowerCase());
        if (resolved) {
          seen.set(resolved, idToName.get(resolved)!);
        }
      }
    });

    // Convert to array and sort by name
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [pickList?.categories, categoriesList]);

  // --- NEW: apply categoryFilter and listSearch to visibleItems ---
  const visibleItemsFiltered = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    let arr = visibleItems;

    if (categoryFilter !== 'all') {
      arr = arr.filter((item) => {
        const product = productMap.get(item.product_id);
        return (product?.category ?? '') === categoryFilter;
      });
    }

    if (!q) return arr;

    return arr.filter((item) => {
      const product = productMap.get(item.product_id);
      const catName = categoriesById.get(product?.category ?? '') ?? product?.category ?? '';
      const searchableText = `${product?.name ?? ''} ${catName} ${product?.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(q);
    });
  }, [visibleItems, productMap, listSearch, categoryFilter, categoriesById]);

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2} mb={2}>
        <Typography variant="h5">{areaName} List</Typography>
        <Stack spacing={1.5} sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Add products to this list
          </Typography>

          <ProductAutocomplete
            availableProducts={filteredProducts}
            onSelect={(product: Product) => {
              void addOrUpdateItem(product);
            }}
            onQueryChange={(q: string) => setQuery(q)}
          />

          {filteredProducts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No available products
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Selecting a product immediately adds it to the pick list.
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            rowGap={1}
          >
            <FormControl component="fieldset" data-testid="packaging-filter-group" sx={{ ml: { xs: 0, sm: 2 } }}>
              <FormLabel component="legend" sx={{ fontSize: '0.875rem' }}>
                Packaging
              </FormLabel>
              <RadioGroup
                row
                aria-label="packaging-filter"
                name="packaging-filter"
                value={packagingFilter}
                onChange={(_, value) => setPackagingFilter(value as 'all' | 'units' | 'cartons')}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  label="All"
                  data-testid="packaging-filter-all"
                />
                <FormControlLabel
                  value="units"
                  control={<Radio size="small" />}
                  label="Units"
                  disabled={packagingInfo.visibleCount === 0 || packagingInfo.uniquePackagingCount === 1}
                  data-testid="packaging-filter-units"
                />
                <FormControlLabel
                  value="cartons"
                  control={<Radio size="small" />}
                  label="Cartons"
                  disabled={packagingInfo.visibleCount === 0 || packagingInfo.uniquePackagingCount === 1}
                  data-testid="packaging-filter-cartons"
                />
              </RadioGroup>
            </FormControl>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { xs: 0, sm: 2 } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPicked}
                    onChange={(event) => setShowPicked(event.target.checked)}
                    disabled={allItemsPicked}
                  />
                }
                label="Show picked"
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleMarkAllPicked}
                disabled={isBatchUpdating}
              >
                {isBatchUpdating ? 'Picking...' : 'Pick Complete'}
              </Button>
            </Stack>
          </Stack>

          {/* NEW: Search List (left) and Category dropdown (right) on the same row */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            rowGap={1}
            sx={{ mt: 1 }}
          >
            <TextField
              size="small"
              placeholder="Search list"
              variant="outlined"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 160 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              SelectProps={{ native: true }}
              label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter((e.target.value as any) ?? 'all')}
              sx={{ width: { xs: '100%', sm: 240 }, ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Stack>
      {pickList?.notes ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {pickList.notes}
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {/* NEW: empty-filter message */}
        {visibleItemsFiltered.length === 0 ? (
          visibleItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items in this pick list
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No items match the filter
            </Typography>
          )
        ) : (
          visibleItemsFiltered.map((item) => (
            <PickItemRow
              key={item.id}
              item={item}
              product={productMap.get(item.product_id)}
              onIncrementQuantity={() => handleIncrementQuantity(item.id)}
              onDecrementQuantity={() => handleDecrementQuantity(item.id)}
              onToggleCarton={() => handleToggleCarton(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))
        )}
      </Stack>
      <Button fullWidth sx={{ mt: 3 }} variant="outlined" onClick={returnToLists}>
        Save and Return
      </Button>
    </Container>
  );
};

export default ActivePickListScreen