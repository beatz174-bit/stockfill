import {
  Alert,
  AlertColor,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDatabase } from '../context/DBProvider';
import { useCategories, useProducts } from '../hooks/dataHooks';

const ManageCategoriesScreen = () => {
  const db = useDatabase();
  const categories = useCategories();
  const products = useProducts();
  const [name, setName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; severity: AlertColor } | null>(null);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const usageByCategory = useMemo(() => {
  return products.reduce<Record<string, number>>((acc, product) => {
    const categoryName = categoriesById.get(product.category) ?? product.category ?? '';
    if (!categoryName) return acc;
    acc[categoryName] = (acc[categoryName] ?? 0) + 1;
    return acc;
  }, {});
}, [products, categoriesById]);


  const addCategory = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setFeedback({ text: 'A category with this name already exists.', severity: 'error' });
      return;
    }
    await db.categories.add({ id: uuidv4(), name: trimmed, created_at: Date.now(), updated_at: Date.now() });
    setName('');
    setFeedback({ text: 'Category added.', severity: 'success' });
  };

  const startEditing = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditName(currentName);
    setFeedback(null);
  };

const saveCategory = async () => {
  if (!editingCategoryId) return;
  const trimmed = editName.trim();
  if (!trimmed) return;

  const category = categories.find((item) => item.id === editingCategoryId);
  if (!category) return;

  const nameExists = categories.some(
    (item) => item.id !== editingCategoryId && item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (nameExists) {
    setFeedback({ text: 'A category with this name already exists.', severity: 'error' });
    return;
  }

  await db.transaction('rw', db.categories, db.products, db.pickLists, async () => {
    // Update category name
    await db.categories.update(editingCategoryId, { name: trimmed, updated_at: Date.now() });

    // For backward-compat products that stored category as the old name,
    // update them to reference the new name OR ideally, to the id.
    // We map products that still have category === oldName to the new name value.
    // (If you ran the normalization migration earlier, most products will already have ids.)
    await db.products
      .where('category')
      .equals(category.name)
      .modify({ category: trimmed, updated_at: Date.now() });

    // Update pickLists that used the old category name
    const pickLists = await db.pickLists.toArray();
    await Promise.all(
      pickLists.map(async (pl) => {
        if (!Array.isArray((pl as any).categories)) return;
        const needs = (pl as any).categories.includes(category.name);
        if (!needs) return;
        const updated = (pl as any).categories.map((c: string) => (c === category.name ? trimmed : c));
        await db.pickLists.update(pl.id, { categories: updated });
      }),
    );
  });

  setEditingCategoryId(null);
  setEditName('');
  setFeedback({ text: 'Category updated. Linked products were refreshed.', severity: 'success' });
};

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditName('');
    setFeedback(null);
  };

const deleteCategory = async (categoryId: string, categoryName: string) => {
  // Count products referencing either the id or the name (legacy)
  const [countById, countByName] = await Promise.all([
    db.products.where('category').equals(categoryId).count(),
    db.products.where('category').equals(categoryName).count(),
  ]);
  const usageCount = countById + countByName;

  if (usageCount > 0) {
    setFeedback({
      text: `Cannot delete '${categoryName}' while ${usageCount} product(s) use it. Update those products first.`,
      severity: 'error',
    });
    return;
  }

  await db.categories.delete(categoryId);
  if (editingCategoryId === categoryId) cancelEditing();
  setFeedback({ text: 'Category deleted.', severity: 'success' });
};


  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Categories
      </Typography>
      <Stack spacing={2}>
        {feedback ? <Alert severity={feedback.severity}>{feedback.text}</Alert> : null}
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            label="Category name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button variant="contained" onClick={addCategory} disabled={!name.trim()}>
            Add
          </Button>
        </Stack>
        <List>
          {categories.map((category) => (
            <ListItem key={category.id} divider>
              {editingCategoryId === category.id ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <IconButton color="primary" onClick={saveCategory} disabled={!editName.trim()} aria-label="Save category">
                    <CheckIcon />
                  </IconButton>
                  <IconButton onClick={cancelEditing} aria-label="Cancel editing">
                    <CloseIcon />
                  </IconButton>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <ListItemText primary={category.name} secondary={`Used by ${usageByCategory[category.name] ?? 0} product(s)`} />
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      onClick={() => startEditing(category.id, category.name)}
                      aria-label={`Edit ${category.name}`}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => deleteCategory(category.id, category.name)}
                      aria-label={`Delete ${category.name}`}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              )}
            </ListItem>
          ))}
        </List>
      </Stack>
    </Container>
  );
};

export default ManageCategoriesScreen