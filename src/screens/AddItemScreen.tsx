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

  const existingProductIds = useMemo(
    () => new Set(items.map((item) => item.product_id)),
    [items],
  );

  const availableProducts = useMemo(
    () => products.filter((product) => !existingProductIds.has(product.id)),
    [existingProductIds, products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return availableProducts;

    return availableProducts.filter((product) => {
      const searchableText = `${product.name} ${product.category} ${product.barcode ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [availableProducts, query]);

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

  const quantityHelperText = selectedProduct?.unit_type
    ? `Enter ${selectedProduct.unit_type} to pick`
    : 'Enter the quantity to pick';
  const cartonLabel = selectedProduct?.bulk_name ? `Carton (${selectedProduct.bulk_name})` : 'Carton';

  const addItem = async () => {
    const productId = selectedProduct?.id;

    if (!id || !productId || existingProductIds.has(productId)) return;
    await db.pickItems.add({
      id: uuidv4(),
      pick_list_id: id,
      product_id: productId,
      quantity_units: quantity,
      quantity_bulk: isCarton ? 1 : 0,
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
          label="Quantity"
          type="number"
          inputProps={{ min: 1 }}
          value={quantity}
          onChange={(event) => {
            const value = Number(event.target.value);
            setQuantity(Number.isNaN(value) || value < 1 ? 1 : value);
          }}
          helperText={quantityHelperText}
          fullWidth
        />
        <FormControlLabel
          control={<Checkbox checked={isCarton} onChange={(event) => setIsCarton(event.target.checked)} />}
          label={cartonLabel}
        />
        <Button variant="contained" disabled={!selectedProduct} onClick={addItem}>
          Add to List
        </Button>
      </Stack>
    </Container>
  );
};
