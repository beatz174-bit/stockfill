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
import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProductRow } from '../components/ProductRow';
import { useProducts } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

const categories = ['Drinks', 'Snacks', 'Dairy', 'Confectionery'];

export const ManageProductsScreen = () => {
  const db = useDatabase();
  const products = useProducts();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [unitType, setUnitType] = useState('unit');
  const [bulkName, setBulkName] = useState('case');
  const [unitsPerBulk, setUnitsPerBulk] = useState(6);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const addProduct = async () => {
    if (!name) return;
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

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Products
      </Typography>
      <Stack spacing={2}>
        <TextField
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">{<SearchIcon />}</InputAdornment> }}
        />
        <Stack spacing={1}>
          <Typography variant="subtitle1">Add Product</Typography>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((cat) => (
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
          <Button variant="contained" onClick={addProduct} disabled={!name}>
            Save Product
          </Button>
        </Stack>
        {filtered.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </Stack>
    </Container>
  );
};
