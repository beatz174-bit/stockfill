import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Area } from '../models/Area';
import { Category } from '../models/Category';
import { PickItem } from '../models/PickItem';
import { PickList } from '../models/PickList';
import { Product } from '../models/Product';
import { ImportExportLog } from '../models/ImportExportLog';
import { applyMigrations } from './migrations';
import { seedDatabase } from './seed';

export class StockFillDB extends Dexie {
  products!: Table<Product>;
  areas!: Table<Area>;
  pickLists!: Table<PickList>;
  pickItems!: Table<PickItem>;
  categories!: Table<Category>;
  importExportLogs!: Table<ImportExportLog>;

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

            const legacyUnits = Number(
              (item as PickItem & { quantity_units?: number }).quantity_units ?? 0,
            );
            const legacyBulk = Number(
              (item as PickItem & { quantity_bulk?: number }).quantity_bulk ?? 0,
            );

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

    this.version(6)
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
            const legacyUnits = Number((item as PickItem & { quantity_units?: number }).quantity_units ?? 0);
            const legacyBulk = Number((item as PickItem & { quantity_bulk?: number }).quantity_bulk ?? 0);
            const hasQuantity = typeof (item as PickItem).quantity === 'number';
            const hasCartonFlag = typeof (item as PickItem).is_carton === 'boolean';

            const updateData: Partial<PickItem> & {
              quantity_units?: undefined;
              quantity_bulk?: undefined;
            } = {};

            if (!hasQuantity) {
              updateData.quantity = legacyBulk > 0 ? legacyBulk : legacyUnits;
            }

            if (!hasCartonFlag) {
              updateData.is_carton = legacyBulk > 0 && legacyUnits === 0;
            }

            if ('quantity_units' in item) {
              updateData.quantity_units = undefined;
            }

            if ('quantity_bulk' in item) {
              updateData.quantity_bulk = undefined;
            }

            if (Object.keys(updateData).length === 0) return undefined;

            updateData.updated_at = now;

            return tx.table('pickItems').update(item.id, updateData);
          }),
        );
      });

    this.version(7)
      .stores({
        products: 'id, name, category, &barcode, archived, created_at, updated_at',
        areas: 'id, name, created_at, updated_at',
        pickLists:
          'id, area_id, created_at, completed_at, auto_add_new_products, categories',
        pickItems:
          'id, pick_list_id, product_id, status, is_carton, quantity, created_at, updated_at',
        categories: 'id, name, created_at, updated_at',
      })
      .upgrade(async (tx) => {
        const pickLists = await tx.table('pickLists').toArray();

        await Promise.all(
          pickLists.map((pickList) => {
            const updates: Partial<PickList> = {};

            if (!Array.isArray((pickList as PickList).categories)) {
              updates.categories = [];
            }

            if (typeof (pickList as PickList).auto_add_new_products !== 'boolean') {
              updates.auto_add_new_products = false;
            }

            if (Object.keys(updates).length === 0) return undefined;

            return tx.table('pickLists').update(pickList.id, updates);
          }),
        );
      });

    this.version(8).stores({
      products: 'id, name, category, &barcode, archived, created_at, updated_at',
      areas: 'id, name, created_at, updated_at',
      pickLists:
        'id, area_id, created_at, completed_at, auto_add_new_products, categories',
      pickItems:
        'id, pick_list_id, product_id, status, is_carton, quantity, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      importExportLogs: 'id, type, timestamp',
    });
  }
}

export const db = new StockFillDB();

export const initializeDatabase = async () => {
  await applyMigrations(db);
  await seedDatabase(db);
};
