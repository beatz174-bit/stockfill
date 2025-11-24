import {
  Autocomplete,
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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAreas, usePickItems, usePickList, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';
import { PickItemRow } from '../components/PickItemRow';
import { PickItem } from '../models/PickItem';
import { Product } from '../models/Product';

const normalizeName = (name: string) => name.trim().toLowerCase();

export const ActivePickListScreen = () => {
  const { id } = useParams();
  const pickList = usePickList(id);
  const items = usePickItems(id);
  const products = useProducts();
  const areas = useAreas();
  const db = useDatabase();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [showPicked, setShowPicked] = useState(true);
  const [itemState, setItemState] = useState(items);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [packagingFilter, setPackagingFilter] = useState<'all' | 'units' | 'cartons'>('all');

  useEffect(() => {
    setItemState((current) => {
      const currentById = new Map(current.map((item) => [item.id, item]));
      return items.map((incoming) => {
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
    products.forEach((product) => {
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

    products.forEach((product) => {
      const existing = dedupedById.get(product.id);
      if (!existing || product.updated_at > existing.updated_at) {
        dedupedById.set(product.id, product);
      }
    });

    const dedupedByName = new Map<string, Product>();

    dedupedById.forEach((product) => {
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

  const categoryFilteredProducts = useMemo(() => {
    if (!pickList?.categories || pickList.categories.length === 0) {
      return sortedProducts;
    }

    const allowedCategories = new Set(
      pickList.categories.map((category) => category.trim().toLowerCase()),
    );

    return sortedProducts.filter((product) =>
      allowedCategories.has(product.category.trim().toLowerCase()),
    );
  }, [pickList?.categories, sortedProducts]);

  const productIdsInList = useMemo(
    () => new Set(itemState.map((item) => item.product_id)),
    [itemState],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const availableProducts = categoryFilteredProducts.filter(
      (product) => !productIdsInList.has(product.id),
    );

    if (!normalizedQuery) return availableProducts;

    return availableProducts.filter((product) => {
      const searchableText = `${product.name} ${product.category} ${product.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [categoryFilteredProducts, productIdsInList, query]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (!filteredProducts.some((product) => product.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [filteredProducts, selectedProduct]);

  useEffect(() => {
    if (allItemsPicked && !showPicked) {
      setShowPicked(true);
    }
  }, [allItemsPicked, showPicked]);

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

  const updateItemState = (itemId: string, updater: (item: PickItem) => PickItem) => {
    setItemState((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const handleIncrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = existing.quantity + 1;
    updateItemState(itemId, (item) => ({ ...item, quantity: nextQuantity, updated_at: Date.now() }));
    await db.pickItems.update(itemId, {
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleDecrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = Math.max(1, (existing.quantity || 1) - 1);

    updateItemState(itemId, (item) => ({ ...item, quantity: nextQuantity, updated_at: Date.now() }));
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

    updateItemState(itemId, (item) => ({
      ...item,
      is_carton: nextCartonFlag,
      quantity: nextQuantity,
      updated_at: Date.now(),
    }));
    await db.pickItems.update(itemId, {
      is_carton: nextCartonFlag,
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleStatusChange = async (itemId: string, status: PickItem['status']) => {
    const nextStatus = status === 'picked' ? 'picked' : 'pending';
    updateItemState(itemId, (item) => ({ ...item, status: nextStatus, updated_at: Date.now() }));
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
    setItemState((current) =>
      current.map((item) => ({ ...item, status: 'picked', updated_at: timestamp })),
    );
    setIsBatchUpdating(true);

    const itemsToUpdate = itemState.length > 0 ? itemState : items;

    try {
      await Promise.all(
        itemsToUpdate.map((item) =>
          db.pickItems.update(item.id, { status: 'picked', updated_at: timestamp }),
        ),
      );
      const refreshedItems = await db.pickItems.where('pick_list_id').equals(id).toArray();
      setItemState(refreshedItems);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const addOrUpdateItem = async (product: Product) => {
    if (!id) return;

    const timestamp = Date.now();
    const existing = itemState.find(
      (item) => item.product_id === product.id && item.is_carton === false,
    );

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
        pick_list_id: id,
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

    setSelectedProduct(null);
    setQuery('');
  };

  const returnToLists = () => {
    navigate('/pick-lists');
  };

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2} mb={2}>
        <Typography variant="h5">{areaName} List</Typography>
        <Stack spacing={1.5} sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Add products to this list
          </Typography>
          <Autocomplete
            options={filteredProducts}
            getOptionLabel={(option) => `${option.name} (${option.category})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedProduct}
            onChange={(_, value) => {
              setSelectedProduct(value);
              if (value) {
                void addOrUpdateItem(value);
              }
            }}
            inputValue={query}
            onInputChange={(_, value, reason) => {
              if (reason === 'input') {
                setQuery(value);
              }

              if (reason === 'clear') {
                setQuery('');
              }
            }}
            filterOptions={(options) => options}
            noOptionsText="No available products"
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search products"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                      <InputAdornment position="end">
                        <Tooltip title="Add a new product">
                          <IconButton
                            aria-label="Add product"
                            component={RouterLink}
                            to="/products"
                            size="small"
                          >
                            <AddCircleOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    </>
                  ),
                }}
              />
            )}
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
            <FormControl component="fieldset" sx={{ ml: { xs: 0, sm: 2 } }}>
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
                  data-testid="packaging-all"
                />
                <FormControlLabel
                  value="units"
                  control={<Radio size="small" />}
                  label="Units"
                  disabled={packagingInfo.visibleCount === 0 || packagingInfo.uniquePackagingCount === 1}
                  data-testid="packaging-units"
                />
                <FormControlLabel
                  value="cartons"
                  control={<Radio size="small" />}
                  label="Cartons"
                  disabled={packagingInfo.visibleCount === 0 || packagingInfo.uniquePackagingCount === 1}
                  data-testid="packaging-cartons"
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
        </Stack>
      </Stack>
      {pickList?.notes ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {pickList.notes}
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {visibleItems.map((item) => (
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
        ))}
      </Stack>
      <Button fullWidth sx={{ mt: 3 }} variant="outlined" onClick={returnToLists}>
        Save and Return
      </Button>
    </Container>
  );
};
