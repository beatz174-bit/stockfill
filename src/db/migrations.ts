// src/db/migrations.ts
import { StockFillDB } from './index';
import { v4 as uuidv4 } from 'uuid';

export const applyMigrations = async (db: StockFillDB) => {
  // Ensure DB is open and ready
  await db.open();

  // Run a single transaction that normalizes products and pickLists
  await db.transaction('rw', db.categories, db.products, db.pickLists, async () => {
    const now = Date.now();

    // Load categories (existing)
    const categories = await db.categories.toArray();
    const categoriesByName = new Map(categories.map((c) => [c.name, c.id]));
    const categoriesById = new Map(categories.map((c) => [c.id, c.name]));

    // 1) Normalize products: category -> categoryId
    const products = await db.products.toArray();
    await Promise.all(
      products.map(async (product) => {
        const cat = product.category ?? '';

        // Skip empty
        if (!cat) return;

        // If already an id that matches a known category, skip
        if (categoriesById.has(cat)) return;

        // If it's a name that matches an existing category, update
        const matchingId = categoriesByName.get(cat);
        if (matchingId) {
          await db.products.update(product.id, { category: matchingId });
          return;
        }

        // Otherwise: create a new category with this name and use its id
        const newCatId = uuidv4();
        await db.categories.add({
          id: newCatId,
          name: cat,
          created_at: now,
          updated_at: now,
        });
        categoriesByName.set(cat, newCatId);
        categoriesById.set(newCatId, cat);

        await db.products.update(product.id, { category: newCatId });
      }),
    );

    // Refresh categories maps (in case we added new ones)
    const updatedCategories = await db.categories.toArray();
    const updatedByName = new Map(updatedCategories.map((c) => [c.name, c.id]));
    const updatedById = new Map(updatedCategories.map((c) => [c.id, c.name]));

    // 2) Normalize pickLists.categories (array) to hold ids (not names)
    const pickLists = await db.pickLists.toArray();
    await Promise.all(
      pickLists.map(async (pl) => {
        if (!Array.isArray((pl as any).categories)) return;

        const newCats = (pl as any).categories.map((entry: string) => {
          // If the entry is already an id we know, keep it
          if (updatedById.has(entry)) return entry;
          // If entry is a name, return its id (if exists)
          const id = updatedByName.get(entry);
          if (id) return id;
          // If it's neither, keep as-is (or optionally create category)
          return entry;
        });

        // Update only if changed
        if (JSON.stringify(newCats) !== JSON.stringify((pl as any).categories)) {
          await db.pickLists.update(pl.id, { categories: newCats });
        }
      }),
    );
  });
};
