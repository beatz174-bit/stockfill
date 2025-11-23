import { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { StockFillDB } from './index';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE } from '../models/Product';

const now = () => Date.now();

export const seedAreas = ['Drinks', 'Snacks', 'Dairy'];

export const seedProducts = [
  { name: 'Nutrient Water Endurance', category: 'Drinks' },
  { name: 'Nutrient Water Focus', category: 'Drinks' },
  { name: 'Cocobella Choc', category: 'Drinks' },
  { name: 'Cocobella straight', category: 'Drinks' },
  { name: 'Cocobella watermelon', category: 'Drinks' },
  { name: 'Cocoa Coast Chocolate', category: 'Drinks' },
  { name: 'Cocoa Coast Mango', category: 'Drinks' },
  { name: 'Cocoa Coast Lychee', category: 'Drinks' },
  { name: 'Cocoa Coast Raspberry', category: 'Drinks' },
  { name: 'Cocoa Coast Pasionfruit', category: 'Drinks' },
  { name: 'Mount Franklin Sparkling Lime', category: 'Drinks' },
  { name: 'Mount Franklin Sparkling', category: 'Drinks' },
  { name: 'Mount Franklin 600ml', category: 'Drinks' },
  { name: 'Nu 600ml', category: 'Drinks' },
  { name: 'Mt Cooroy 600ml', category: 'Drinks' },
  { name: 'Mt Coory 1L', category: 'Drinks' },
  { name: 'Mt Cooroy 1.5L', category: 'Drinks' },
  { name: 'Pump 750', category: 'Drinks' },
  { name: 'Pump Lime', category: 'Drinks' },
  { name: 'Pump Berry', category: 'Drinks' },
  { name: 'Pump Watermelon', category: 'Drinks' },
  { name: 'Mount Franklin 1.5L', category: 'Drinks' },
  { name: 'Pump 1.5L', category: 'Drinks' },
  { name: 'Nu 1.5L', category: 'Drinks' },
  { name: 'Smiths Salt n Vinegar 90g', category: 'Chips' },
  { name: 'Mars Bar', category: 'Chocolates' },
];

export const seedCategories = Array.from(
  new Set(seedProducts.map(({ category }) => category)),
).sort();

const normalizeName = (name: string) => name.trim().toLowerCase();

const dedupeSeedRecords = async <T extends { id: string; name: string }>(
  table: Table<T>,
  seededNames: Set<string>,
) => {
  const existing = await table.toArray();
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  existing.forEach((record) => {
    const normalized = normalizeName(record.name);
    if (!seededNames.has(normalized)) return;

    if (seen.has(normalized)) {
      duplicateIds.push(record.id);
      return;
    }

    seen.add(normalized);
  });

  if (duplicateIds.length > 0) {
    await table.bulkDelete(duplicateIds);
  }

  return seen;
};

const buildProductRecord = (product: { name: string; category: string }) => ({
  id: uuidv4(),
  name: product.name,
  category: product.category,
  unit_type: DEFAULT_UNIT_TYPE,
  bulk_name: DEFAULT_BULK_NAME,
  archived: false,
  created_at: now(),
  updated_at: now(),
});

export const seedDatabase = async (db: StockFillDB) => {
  const seededAreaNames = new Set(seedAreas.map(normalizeName));
  const existingSeedAreas = await dedupeSeedRecords(db.areas, seededAreaNames);
  const missingAreas = seedAreas.filter((area) => !existingSeedAreas.has(normalizeName(area)));

  if (missingAreas.length > 0) {
    await db.areas.bulkAdd(
      missingAreas.map((name) => ({
        id: uuidv4(),
        name,
        created_at: now(),
        updated_at: now(),
      })),
    );
  }

  const seededCategoryNames = new Set(seedCategories.map(normalizeName));
  const existingSeedCategories = await dedupeSeedRecords(db.categories, seededCategoryNames);
  const missingCategories = seedCategories.filter(
    (category) => !existingSeedCategories.has(normalizeName(category)),
  );

  if (missingCategories.length > 0) {
    await db.categories.bulkAdd(
      missingCategories.map((category) => ({
        id: uuidv4(),
        name: category,
        created_at: now(),
        updated_at: now(),
      })),
    );
  }

  const seededProductNames = new Set(seedProducts.map(({ name }) => normalizeName(name)));
  const existingSeedProducts = await dedupeSeedRecords(db.products, seededProductNames);
  const missingProducts = seedProducts.filter(
    (product) => !existingSeedProducts.has(normalizeName(product.name)),
  );

  if (missingProducts.length > 0) {
    await db.products.bulkAdd(missingProducts.map(buildProductRecord));
  }
};
