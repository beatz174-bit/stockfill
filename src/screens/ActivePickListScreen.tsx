import {
  Autocomplete,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  InputAdornment,
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
  const [quantity, setQuantity] = useState(1);
  const [isCarton, setIsCarton] = useState(false);

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

  useEffect(() => {
    setQuantity(1);
    setIsCarton(false);
  }, [selectedProduct]);

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
    if (!id || quantity <= 0) return;

    const existing = items.find(
      (item) => item.product_id === product.id && item.is_carton === isCarton,
    );

    if (existing) {
      await db.pickItems.update(existing.id, {
        quantity: existing.quantity + quantity,
        updated_at: Date.now(),
      });
    } else {
      await db.pickItems.add({
        id: uuidv4(),
        pick_list_id: id,
        product_id: product.id,
        quantity,
        is_carton: isCarton,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    setSelectedProduct(null);
    setQuery('');
    setQuantity(1);
    setIsCarton(false);
  };

  const returnToLists = () => {
    navigate('/pick-lists');
  };

  const packagingLabel = isCarton
    ? selectedProduct?.bulk_name ?? 'Cartons'
    : selectedProduct?.unit_type ?? 'Units';
  const quantityHelperText = selectedProduct
    ? `Enter ${packagingLabel.toLowerCase()} to pick`
    : 'Select a product to add it to the list';
  const cartonCheckboxLabel = selectedProduct?.bulk_name
    ? `Carton (${selectedProduct.bulk_name})`
    : 'Carton pick';

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              type="number"
              label={`Quantity (${packagingLabel})`}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
              inputProps={{ min: 1 }}
              helperText={quantityHelperText}
              fullWidth
            />
            <FormControlLabel
              control={<Checkbox checked={isCarton} onChange={(event) => setIsCarton(event.target.checked)} />}
              label={cartonCheckboxLabel}
              disabled={!selectedProduct}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Selecting a product immediately adds it to the pick list.
          </Typography>
        </Stack>
      </Stack>
      {pickList?.notes ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {pickList.notes}
        </Typography>
      ) : null}
      <Stack spacing={1}>
        {items.map((item) => (
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
