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
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProductRow } from '../components/ProductRow';
import { useCategories, useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const ManageProductsScreen = () => {
  const db = useDatabase();
  const products = useProducts();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unitType, setUnitType] = useState('unit');
  const [bulkName, setBulkName] = useState('case');
  const [unitsPerBulk, setUnitsPerBulk] = useState(6);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories.map((item) => item.name);
    const productCategories = products.map((product) => product.category);
    return Array.from(new Set([...categoryNames, ...productCategories]));
  }, [categories, products]);

  useEffect(() => {
    if (categoryOptions.length === 0) return;
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0]);
    }
  }, [category, categoryOptions]);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const addProduct = async () => {
    if (!name || !category) return;
    await db.products.add({
      id: uuidv4(),
      name,
      category,
      unit_type: unitType,
      bulk_name: bulkName,
      units_per_bulk: unitsPerBulk,
      archived: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    setName('');
  };

  const updateProduct = async (
    productId: string,
    updates: {
      name: string;
      category: string;
      unit_type: string;
      bulk_name?: string;
      units_per_bulk?: number;
    },
  ) => {
    await db.products.update(productId, { ...updates, updated_at: Date.now() });
  };

  const deleteProduct = async (productId: string) => {
    await db.products.delete(productId);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Products
      </Typography>
      <Stack spacing={2}>
        <Button component={RouterLink} to="/categories" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Edit Categories
        </Button>
        <TextField
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{<SearchIcon />}</InputAdornment> }}
        />
        <Stack spacing={1}>
          <Typography variant="subtitle1">Add Product</Typography>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={categoryOptions.length === 0}
          >
            {categoryOptions.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Unit Type" value={unitType} onChange={(event) => setUnitType(event.target.value)} />
          <TextField label="Bulk Name" value={bulkName} onChange={(event) => setBulkName(event.target.value)} />
          <TextField
            label="Units per Bulk"
            type="number"
            value={unitsPerBulk}
            onChange={(event) => setUnitsPerBulk(Number(event.target.value))}
          />
          <Button variant="contained" onClick={addProduct} disabled={!name || !category}>
            Save Product
          </Button>
        </Stack>
        {filtered.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            categories={categoryOptions}
            onSave={updateProduct}
            onDelete={deleteProduct}
          />
        ))}
      </Stack>
    </Container>
  );
};
