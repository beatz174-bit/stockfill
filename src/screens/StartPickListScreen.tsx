import {
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAreas, useCategories } from '../hooks/dataHooks';
import { useDatabase } from '../context/DBProvider';

export const StartPickListScreen = () => {
  const areas = useAreas();
  const categories = useCategories();
  const db = useDatabase();
  const navigate = useNavigate();
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [autoAddNewProducts, setAutoAddNewProducts] = useState(true);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((category) => {
      const key = category.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  const sortedCategories = useMemo(
    () =>
      [...uniqueCategories].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [uniqueCategories],
  );

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const start = async () => {
    if (!areaId) return;
    const pickListId = uuidv4();
    const timestamp = Date.now();

    const selectedCategoryNames = categories
      .filter((category) => selectedCategories.includes(category.id))
      .map((category) => category.name);

    await db.transaction('rw', db.pickLists, db.pickItems, db.products, async () => {
      await db.pickLists.add({
        id: pickListId,
        area_id: areaId,
        created_at: timestamp,
        notes: notes.trim() || undefined,
        categories: selectedCategoryNames,
        auto_add_new_products: autoAddNewProducts,
      });

      if (selectedCategoryNames.length === 0) {
        return;
      }

      const products = await db.products.toArray();
      const productsInCategories = products.filter(
        (product) => selectedCategoryNames.includes(product.category) && !product.archived,
      );

      const uniqueProducts: typeof productsInCategories = [];
      const seenNames = new Set<string>();

      productsInCategories.forEach((product) => {
        const nameKey = product.name.toLowerCase();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          uniqueProducts.push(product);
        }
      });

      if (productsInCategories.length === 0) {
        return;
      }

      await db.pickItems.bulkAdd(
        uniqueProducts.map((product) => ({
          id: uuidv4(),
          pick_list_id: pickListId,
          product_id: product.id,
          quantity: 1,
          is_carton: false,
          status: 'pending',
          created_at: timestamp,
          updated_at: timestamp,
        })),
      );
    });
    navigate(`/pick-lists/${pickListId}`);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create Pick List
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Pick lists are reusable. Create one for each store area and update it anytime you restock.
      </Typography>
      <Stack spacing={2}>
        <TextField
          select
          fullWidth
          label="Area"
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
        >
          {areas.map((area) => (
            <MenuItem key={area.id} value={area.id}>
              {area.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          multiline
          minRows={2}
        />
        <Stack spacing={1}>
          <Typography variant="subtitle2">Add categories to prefill products</Typography>
          <FormGroup>
            {sortedCategories.map((category) => (
              <FormControlLabel
                key={category.id}
                control={
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleToggleCategory(category.id)}
                  />
                }
                label={category.name}
              />
            ))}
          </FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoAddNewProducts}
                onChange={(event) => setAutoAddNewProducts(event.target.checked)}
              />
            }
            label="Add new products"
          />
        </Stack>
        <Button variant="contained" disabled={!areaId} onClick={start}>
          Save Pick List
        </Button>
      </Stack>
    </Container>
  );
};
