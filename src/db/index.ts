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

    this.version(3)
      .stores({
        products:
          'id, name, category, barcode, archived, created_at, updated_at',
        areas: 'id, name, created_at, updated_at',
        pickLists: 'id, area_id, created_at, completed_at',
        pickItems: 'id, pick_list_id, product_id, status, created_at, updated_at',
        categories: 'id, name, created_at, updated_at',
      })
      .upgrade(async (tx) => {
        const products = await tx.table('products').toArray();
        const seenBarcodes = new Set<string>();
        const now = Date.now();

        await Promise.all(
          products.map((product) => {
            if (!product.barcode) return undefined;

            if (seenBarcodes.has(product.barcode)) {
              return tx.table('products').update(product.id, {
                barcode: undefined,
                updated_at: now,
              });
            }

            seenBarcodes.add(product.barcode);
            return undefined;
          }),
        );
      });

    this.version(4).stores({
      products: 'id, name, category, &barcode, archived, created_at, updated_at',
      areas: 'id, name, created_at, updated_at',
      pickLists: 'id, area_id, created_at, completed_at',
      pickItems: 'id, pick_list_id, product_id, status, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
    });

    this.version(5)
      .stores({
        products: 'id, name, category, &barcode, archived, created_at, updated_at',
        areas: 'id, name, created_at, updated_at',
        pickLists: 'id, area_id, created_at, completed_at',
        pickItems:
          'id, pick_list_id, product_id, status, is_carton, quantity, created_at, updated_at',
        categories: 'id, name, created_at, updated_at',
      })
      .upgrade(async (tx) => {
        const items = await tx.table('pickItems').toArray();
        const now = Date.now();

        await Promise.all(
          items.map(async (item) => {
            const hasNewFields =
              typeof (item as PickItem).quantity === 'number' &&
              typeof (item as PickItem).is_carton === 'boolean';

            if (hasNewFields) return undefined;

            const legacyUnits = Number((item as PickItem).quantity_units ?? 0);
            const legacyBulk = Number((item as PickItem).quantity_bulk ?? 0);

            if (legacyUnits > 0 && legacyBulk > 0) {
              await tx.table('pickItems').update(item.id, {
                quantity: legacyUnits,
                is_carton: false,
                updated_at: now,
              });

              return tx.table('pickItems').add({
                ...item,
                id: uuidv4(),
                quantity: legacyBulk,
                is_carton: true,
                created_at: (item as PickItem).created_at ?? now,
                updated_at: now,
              });
            }

            if (legacyBulk > 0) {
              return tx.table('pickItems').update(item.id, {
                quantity: legacyBulk,
                is_carton: true,
                updated_at: now,
              });
            }

            return tx.table('pickItems').update(item.id, {
              quantity: legacyUnits,
              is_carton: false,
              updated_at: now,
            });
          }),
        );
      });
  }
}

export const db = new StockFillDB();

export const initializeDatabase = async () => {
  await applyMigrations(db);
  await seedDatabase(db);
};
