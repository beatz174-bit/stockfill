import { AlertColor, Container, Typography } from '@mui/material';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionOutcome, EditableEntityList } from '../components/EditableEntityList';
import { useDatabase } from '../context/DBProvider';
import { useCategories, useProducts } from '../hooks/dataHooks';

const ManageCategoriesScreen = () => {
  const db = useDatabase();
  const categories = useCategories();
  const products = useProducts();

  const usageByCategory = useMemo(() => {
    const categoriesById = new Map(categories.map((category) => [category.id, category.name]));
    return products.reduce<Record<string, number>>((acc, product) => {
      const categoryName = categoriesById.get(product.category) ?? product.category ?? '';
      if (!categoryName) return acc;
      acc[categoryName] = (acc[categoryName] ?? 0) + 1;
      return acc;
    }, {});
  }, [categories, products]);

  const validateCategoryName = (value: string) => {
    return Boolean(value.trim());
  };

  const addCategory = async (name: string): Promise<ActionOutcome> => {
    const trimmed = name.trim();
    const exists = categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { text: 'A category with this name already exists.', severity: 'error', success: false };
    }

    await db.categories.add({ id: uuidv4(), name: trimmed, created_at: Date.now(), updated_at: Date.now() });
    return { text: 'Category added.', severity: 'success' };
  };

  const saveCategory = async (categoryId: string, updatedName: string): Promise<ActionOutcome> => {
    const trimmed = updatedName.trim();
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return { text: 'Category not found.', severity: 'error', success: false };

    const nameExists = categories.some(
      (item) => item.id !== categoryId && item.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameExists) {
      return { text: 'A category with this name already exists.', severity: 'error', success: false };
    }

    await db.transaction('rw', db.categories, db.products, db.pickLists, async () => {
      await db.categories.update(categoryId, { name: trimmed, updated_at: Date.now() });

      await db.products.where('category').equals(category.name).modify({ category: trimmed, updated_at: Date.now() });

      const pickLists = await db.pickLists.toArray();
      await Promise.all(
        pickLists.map(async (pickList) => {
          if (!Array.isArray((pickList as any).categories)) return;
          const needsUpdate = (pickList as any).categories.includes(category.name);
          if (!needsUpdate) return;
          const updatedCategories = (pickList as any).categories.map((existing: string) =>
            existing === category.name ? trimmed : existing,
          );
          await db.pickLists.update(pickList.id, { categories: updatedCategories });
        }),
      );
    });

    return { text: 'Category updated. Linked products were refreshed.', severity: 'success' };
  };

  const deleteCategory = async (categoryId: string, categoryName: string): Promise<ActionOutcome> => {
    const [countById, countByName] = await Promise.all([
      db.products.where('category').equals(categoryId).count(),
      db.products.where('category').equals(categoryName).count(),
    ]);
    const usageCount = countById + countByName;

    if (usageCount > 0) {
      return {
        text: `Cannot delete '${categoryName}' while ${usageCount} product(s) use it. Update those products first.`,
        severity: 'error' satisfies AlertColor,
        success: false,
      };
    }

    await db.categories.delete(categoryId);
    return { text: 'Category deleted.', severity: 'success' };
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Manage Categories
      </Typography>
      <EditableEntityList
        nameLabel="Category name"
        addButtonLabel="Add"
        entityLabel="Category"
        entities={categories.map((category) => ({
          id: category.id,
          name: category.name,
          secondaryText: `Used by ${usageByCategory[category.name] ?? 0} product(s)`,
        }))}
        validateName={validateCategoryName}
        onAdd={addCategory}
        onUpdate={saveCategory}
        onDelete={deleteCategory}
      />
    </Container>
  );
};

export default ManageCategoriesScreen;
