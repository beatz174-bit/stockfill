import {
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { NumericStepper } from '../components/NumericStepper';
import { usePickItems, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const AddItemScreen = () => {
  const { id } = useParams();
  const db = useDatabase();
  const items = usePickItems(id);
  const products = useProducts();
  const [productId, setProductId] = useState('');
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState(1);
  const [bulk, setBulk] = useState(0);
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
    if (!productId) return;
    if (!filteredProducts.some((product) => product.id === productId)) {
      setProductId('');
    }
  }, [filteredProducts, productId]);

  const addItem = async () => {
    if (!id || !productId || existingProductIds.has(productId)) return;
    await db.pickItems.add({
      id: uuidv4(),
      pick_list_id: id,
      product_id: productId,
      quantity_units: units,
      quantity_bulk: bulk,
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
        <TextField
          placeholder="Search products"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{<SearchIcon />}</InputAdornment> }}
        />
        <TextField
          select
          label="Product"
          fullWidth
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          {filteredProducts.map((product) => (
            <MenuItem key={product.id} value={product.id}>
              {product.name} ({product.category})
            </MenuItem>
          ))}
        </TextField>
        <NumericStepper label="Units" value={units} onChange={setUnits} />
        <NumericStepper label="Bulk" value={bulk} onChange={setBulk} />
        <Button variant="contained" disabled={!productId} onClick={addItem}>
          Add to List
        </Button>
      </Stack>
    </Container>
  );
};
