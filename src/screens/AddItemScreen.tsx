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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { usePickItems, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const AddItemScreen = () => {
  const { id } = useParams();
  const db = useDatabase();
  const items = usePickItems(id);
  const products = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<typeof products[number] | null>(null);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isCarton, setIsCarton] = useState(false);
  const navigate = useNavigate();
  const unitLabel = selectedProduct?.unit_type ?? 'Units';
  const cartonLabel = selectedProduct?.bulk_name ?? 'Cartons';

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

  const packagingLabel = isCarton ? cartonLabel : unitLabel;
  const quantityHelperText = selectedProduct
    ? `Enter ${packagingLabel.toLowerCase()} to pick`
    : 'Enter the quantity to pick';
  const cartonCheckboxLabel = selectedProduct?.bulk_name
    ? `Carton (${selectedProduct.bulk_name})`
    : 'Carton pick';

  const addItem = async () => {
    const productId = selectedProduct?.id;

    if (!id || !productId || quantity <= 0 || Number.isNaN(quantity)) return;

    const existing = items.find((item) => item.product_id === productId && item.is_carton === isCarton);

    if (existing) {
      await db.pickItems.update(existing.id, {
        quantity: existing.quantity + quantity,
        updated_at: Date.now(),
      });
      navigate(`/pick-lists/${id}`);
      return;
    }

    await db.pickItems.add({
      id: uuidv4(),
      pick_list_id: id,
      product_id: productId,
      quantity,
      is_carton: isCarton,
      status: 'pending',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    navigate(`/pick-lists/${id}`);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Add Item
      </Typography>
      <Stack spacing={2}>
        <Autocomplete
          options={filteredProducts}
          getOptionLabel={(option) => `${option.name} (${option.category})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedProduct}
          onChange={(_, value) => setSelectedProduct(value)}
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
        <TextField
          type="number"
          label={`Quantity (${packagingLabel})`}
          value={quantity}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setQuantity(Number.isNaN(nextValue) ? 1 : Math.max(1, nextValue));
          }}
          inputProps={{ min: 1 }}
          helperText={quantityHelperText}
        />
        <FormControlLabel
          control={<Checkbox checked={isCarton} onChange={(event) => setIsCarton(event.target.checked)} />}
          label={cartonCheckboxLabel}
          disabled={!selectedProduct}
        />
        <Button variant="contained" disabled={!selectedProduct} onClick={addItem}>
          Add to List
        </Button>
      </Stack>
    </Container>
  );
};
