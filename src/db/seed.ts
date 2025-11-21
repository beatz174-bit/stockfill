import { v4 as uuidv4 } from 'uuid';
import { StockFillDB } from './index';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE } from '../models/Product';

const now = () => Date.now();

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
    await db.categories.bulkAdd([
      { id: uuidv4(), name: 'Drinks', created_at: now(), updated_at: now() },
      { id: uuidv4(), name: 'Snacks', created_at: now(), updated_at: now() },
      { id: uuidv4(), name: 'Dairy', created_at: now(), updated_at: now() },
      { id: uuidv4(), name: 'Confectionery', created_at: now(), updated_at: now() },
    ]);
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd([
      {
        id: uuidv4(),
        name: 'Sparkling Water 500ml',
        category: 'Drinks',
        unit_type: DEFAULT_UNIT_TYPE,
        bulk_name: DEFAULT_BULK_NAME,
        units_per_bulk: 12,
        archived: false,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: uuidv4(),
        name: 'Salted Chips 50g',
        category: 'Snacks',
        unit_type: DEFAULT_UNIT_TYPE,
        bulk_name: DEFAULT_BULK_NAME,
        units_per_bulk: 24,
        archived: false,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: uuidv4(),
        name: 'Chocolate Bar',
        category: 'Confectionery',
        unit_type: DEFAULT_UNIT_TYPE,
        bulk_name: DEFAULT_BULK_NAME,
        units_per_bulk: 32,
        archived: false,
        created_at: now(),
        updated_at: now(),
      },
    ]);
  }
};
