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

  const allItemsPicked = useMemo(
    () => items.length > 0 && items.every((item) => item.status === 'picked'),
    [items],
  );

  const areaName = useMemo(
    () => areas.find((area) => area.id === pickList?.area_id)?.name ?? 'Area',
    [areas, pickList?.area_id],
  );

  const sortedProducts = useMemo(() => {
    const uniqueProducts = new Map<string, Product>();

    products.forEach((product) => {
      uniqueProducts.set(product.id, product);
    });

    return Array.from(uniqueProducts.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sortedProducts;

    return sortedProducts.filter((product) => {
      const searchableText = `${product.name} ${product.category} ${product.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [sortedProducts, query]);

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

  const visibleItems = useMemo(() => {
    let filteredItems = showPicked ? items : items.filter((item) => item.status !== 'picked');

    if (itemFilter === 'cartons') {
      return filteredItems.filter((item) => item.is_carton);
    }

    if (itemFilter === 'units') {
      return filteredItems.filter((item) => !item.is_carton);
    }

    return filteredItems;
  }, [itemFilter, items, showPicked]);

  const handleIncrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;
    await db.pickItems.update(itemId, {
      quantity: existing.quantity + 1,
      updated_at: Date.now(),
    });
  };

  const handleDecrementQuantity = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    const nextQuantity = Math.max(1, (existing.quantity || 1) - 1);

    await db.pickItems.update(itemId, {
      quantity: nextQuantity,
      updated_at: Date.now(),
    });
  };

  const handleToggleCarton = async (itemId: string) => {
    const existing = await db.pickItems.get(itemId);
    if (!existing) return;

    await db.pickItems.update(itemId, {
      is_carton: !existing.is_carton,
      quantity: existing.quantity || 1,
      updated_at: Date.now(),
    });
  };

  const handleStatusChange = async (itemId: string, status: PickItem['status']) => {
    const nextStatus = status === 'picked' ? 'picked' : 'pending';
    await db.pickItems.update(itemId, { status: nextStatus, updated_at: Date.now() });
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.pickItems.delete(itemId);
  };

  const handleMarkAllPicked = async () => {
    setShowPicked(true);
    const timestamp = Date.now();
    await Promise.all(
      items.map((item) =>
        db.pickItems.update(item.id, { status: 'picked', updated_at: timestamp }),
      ),
    );
  };

  const addOrUpdateItem = async (product: Product) => {
    if (!id) return;

    const existing = items.find(
      (item) => item.product_id === product.id && item.is_carton === false,
    );

    if (existing) {
      await db.pickItems.update(existing.id, {
        quantity: existing.quantity + 1,
        updated_at: Date.now(),
      });
    } else {
      await db.pickItems.add({
        id: uuidv4(),
        pick_list_id: id,
        product_id: product.id,
        quantity: 1,
        is_carton: false,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
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
            noOptionsText={query.trim() ? 'No matching products' : 'No products available'}
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
                value={itemFilter}
                onChange={(event) =>
                  setItemFilter(event.target.value as 'all' | 'cartons' | 'units')
                }
                sx={{ flexGrow: 1 }}
              >
                <FormControlLabel value="all" control={<Radio />} label="All" />
                <FormControlLabel value="cartons" control={<Radio />} label="Cartons" />
                <FormControlLabel value="units" control={<Radio />} label="Units" />
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
            product={products.find((p) => p.id === item.product_id)}
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
