import Dexie, { Table } from 'dexie';
import { Area } from '../models/Area';
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

  constructor() {
    super('stockfill');
    this.version(1).stores({
      products:
        'id, name, category, barcode, archived, created_at, updated_at',
      areas: 'id, name, created_at, updated_at',
      pickLists: 'id, area_id, created_at, completed_at',
      pickItems: 'id, pick_list_id, product_id, status, created_at, updated_at',
    });
  }
}

export const db = new StockFillDB();

export const initializeDatabase = async () => {
  await applyMigrations(db);
  await seedDatabase(db);
};
