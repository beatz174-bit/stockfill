import {
  Autocomplete,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
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
  const [itemFilter, setItemFilter] = useState<'all' | 'cartons' | 'units'>('all');
  const [showPicked, setShowPicked] = useState(true);
  const [itemState, setItemState] = useState(items);

  useEffect(() => {
    setItemState(items);
  }, [items]);

  const itemsVisibleByStatus = useMemo(
    () => (showPicked ? itemState : itemState.filter((item) => item.status !== 'picked')),
    [itemState, showPicked],
  );

  const hasPickedItemsInList = useMemo(
    () => itemState.some((item) => item.status === 'picked'),
    [itemState],
  );
  const hasUnpickedItemsInList = useMemo(
    () => itemState.some((item) => item.status !== 'picked'),
    [itemState],
  );
  const hasCartonItems = useMemo(
    () => itemsVisibleByStatus.some((item) => item.is_carton),
    [itemsVisibleByStatus],
  );
  const hasUnitItems = useMemo(
    () => itemsVisibleByStatus.some((item) => !item.is_carton),
    [itemsVisibleByStatus],
  );
  const allItemsPicked = useMemo(
    () => itemState.length > 0 && !hasUnpickedItemsInList,
    [hasUnpickedItemsInList, itemState.length],
  );
  const allItemsUnpicked = useMemo(
    () => itemState.length > 0 && !hasPickedItemsInList,
    [hasPickedItemsInList, itemState.length],
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

  const sortedItems = useMemo(() => {
    return [...itemsVisibleByStatus].sort((a, b) => {
      const timeA = a.created_at ?? a.updated_at ?? 0;
      const timeB = b.created_at ?? b.updated_at ?? 0;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const nameA = normalizeName(productMap.get(a.product_id)?.name ?? '');
      const nameB = normalizeName(productMap.get(b.product_id)?.name ?? '');

      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }, [itemsVisibleByStatus, productMap]);

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

  const packagingFiltersDisabled = !showPicked || allItemsPicked || allItemsUnpicked;
  const appliedItemFilter = useMemo(() => {
    if (packagingFiltersDisabled) {
      return 'all';
    }

    if (itemFilter === 'cartons' && !hasCartonItems) {
      return hasUnitItems ? 'units' : 'all';
    }

    if (itemFilter === 'units' && !hasUnitItems) {
      return hasCartonItems ? 'cartons' : 'all';
    }

    return itemFilter;
  }, [hasCartonItems, hasUnitItems, itemFilter, packagingFiltersDisabled]);

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

  useEffect(() => {
    setItemFilter((current) => (current === appliedItemFilter ? current : appliedItemFilter));
  }, [appliedItemFilter]);

  const visibleItems = useMemo(() => {
    let filteredItems = showPicked
      ? sortedItems
      : sortedItems.filter((item) => item.status !== 'picked');

    if (appliedItemFilter === 'cartons') {
      return filteredItems.filter((item) => item.is_carton);
    }

    if (appliedItemFilter === 'units') {
      return filteredItems.filter((item) => !item.is_carton);
    }

    return filteredItems;
  }, [appliedItemFilter, showPicked, sortedItems]);

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
    setShowPicked(true);
    const timestamp = Date.now();
    setItemState((current) =>
      current.map((item) => ({ ...item, status: 'picked', updated_at: timestamp })),
    );
    await Promise.all(
      itemState.map((item) =>
        db.pickItems.update(item.id, { status: 'picked', updated_at: timestamp }),
      ),
    );
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
          <FormControl>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Filter list by packaging
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              rowGap={1}
            >
              <RadioGroup
                row
                value={appliedItemFilter}
                onChange={(event) =>
                  setItemFilter(event.target.value as 'all' | 'cartons' | 'units')
                }
                sx={{ flexGrow: 1 }}
              >
                <FormControlLabel value="all" control={<Radio />} label="All" />
                <FormControlLabel
                  value="cartons"
                  control={<Radio />}
                  label="Cartons"
                  disabled={packagingFiltersDisabled}
                />
                <FormControlLabel
                  value="units"
                  control={<Radio />}
                  label="Units"
                  disabled={packagingFiltersDisabled}
                />
              </RadioGroup>
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
                <Button variant="contained" size="small" onClick={handleMarkAllPicked}>
                  Pick Complete
                </Button>
              </Stack>
            </Stack>
          </FormControl>
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
