import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Area } from '../models/Area';
import { Category } from '../models/Category';
import { PickItem } from '../models/PickItem';
import { PickList } from '../models/PickList';
import { Product } from '../models/Product';
import { applyMigrations } from './migrations';
import { seedDatabase } from './seed';

export class StockFillDB extends Dexie {
  products!: Table<Product>;
  areas!: Table<Area>;
  pickLists!: Table<PickList>;
  pickItems!: Table<PickItem>;
  categories!: Table<Category>;

  constructor() {
    super('stockfill');
    this.version(1).stores({
      products:
        'id, name, category, barcode, archived, created_at, updated_at',
      areas: 'id, name, created_at, updated_at',
      pickLists: 'id, area_id, created_at, completed_at',
      pickItems: 'id, pick_list_id, product_id, status, created_at, updated_at',
    });
    this.version(2)
      .stores({
        products:
          'id, name, category, barcode, archived, created_at, updated_at',
        areas: 'id, name, created_at, updated_at',
        pickLists: 'id, area_id, created_at, completed_at',
        pickItems: 'id, pick_list_id, product_id, status, created_at, updated_at',
        categories: 'id, name, created_at, updated_at',
      })
      .upgrade(async (tx) => {
        const existingCategories = await tx.table('categories').count();
        if (existingCategories > 0) return;

        const products = await tx.table('products').toArray();
        const uniqueCategories = Array.from(new Set(products.map((product) => product.category)));
        if (uniqueCategories.length === 0) return;

        const now = Date.now();
        await tx.table('categories').bulkAdd(
          uniqueCategories.map((name: string) => ({
            id: uuidv4(),
            name,
            created_at: now,
            updated_at: now,
          })),
        );
      });
  }
}

export const db = new StockFillDB();

export const initializeDatabase = async () => {
  await applyMigrations(db);
  await seedDatabase(db);
};
