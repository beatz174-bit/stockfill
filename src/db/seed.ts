import { v4 as uuidv4 } from 'uuid';
import { StockFillDB } from './index';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE } from '../models/Product';

const now = () => Date.now();

const seedProducts = [
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

const seedCategories = Array.from(
  new Set(seedProducts.map(({ category }) => category)),
).sort();

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
  const areaCount = await db.areas.count();
  if (areaCount === 0) {
    await db.areas.bulkAdd([
      { id: uuidv4(), name: 'Drinks', created_at: now(), updated_at: now() },
      { id: uuidv4(), name: 'Snacks', created_at: now(), updated_at: now() },
      { id: uuidv4(), name: 'Dairy', created_at: now(), updated_at: now() },
    ]);
  }

  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd(
      seedCategories.map((category) => ({
        id: uuidv4(),
        name: category,
        created_at: now(),
        updated_at: now(),
      })),
    );
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd(seedProducts.map(buildProductRecord));
  }
};
