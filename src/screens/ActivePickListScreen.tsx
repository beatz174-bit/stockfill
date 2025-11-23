import {
  Autocomplete,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useParams, useNavigate } from 'react-router-dom';
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

  const areaName = useMemo(
    () => areas.find((area) => area.id === pickList?.area_id)?.name ?? 'Area',
    [areas, pickList?.area_id],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;

    return products.filter((product) => {
      const searchableText = `${product.name} ${product.category} ${product.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [products, query]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (!filteredProducts.some((product) => product.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [filteredProducts, selectedProduct]);

  const visibleItems = useMemo(() => {
    if (itemFilter === 'cartons') {
      return items.filter((item) => item.is_carton);
    }

    if (itemFilter === 'units') {
      return items.filter((item) => !item.is_carton);
    }

    return items;
  }, [itemFilter, items]);

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
            <RadioGroup
              row
              value={itemFilter}
              onChange={(event) =>
                setItemFilter(event.target.value as 'all' | 'cartons' | 'units')
              }
            >
              <FormControlLabel value="all" control={<Radio />} label="All" />
              <FormControlLabel value="cartons" control={<Radio />} label="Cartons" />
              <FormControlLabel value="units" control={<Radio />} label="Units" />
            </RadioGroup>
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
