import JSZip from 'jszip';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { exportData, importFiles } from './importExportService';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Area } from '../models/Area';
import { PickList } from '../models/PickList';
import { PickItem } from '../models/PickItem';
import { StockFillDB } from '../db';

class MockTable<T extends { id: string }> {
  constructor(public items: T[] = []) {}

  async toArray() {
    return [...this.items];
  }

  async add(item: T) {
    this.items.push(item);
    return item.id;
  }

  async get(id: string) {
    return this.items.find((item) => item.id === id);
  }
}

const createMockDb = (data?: {
  products?: Product[];
  categories?: Category[];
  areas?: Area[];
  pickLists?: PickList[];
  pickItems?: PickItem[];
}) => {
  const db = {
    products: new MockTable<Product>(data?.products ?? []),
    categories: new MockTable<Category>(data?.categories ?? []),
    areas: new MockTable<Area>(data?.areas ?? []),
    pickLists: new MockTable<PickList>(data?.pickLists ?? []),
    pickItems: new MockTable<PickItem>(data?.pickItems ?? []),
    importExportLogs: new MockTable<any>([]),
    transaction: async (_mode: string, ...args: any[]) => {
      const callback = args[args.length - 1];
      return callback();
    },
  } as unknown as StockFillDB;

  return db;
};

const stubDownloads = () => {
  const anchor = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();
  // @ts-expect-error jsdom stub
  vi.stubGlobal('document', { createElement: () => anchor });
  // @ts-expect-error jsdom stub
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  return { anchor, createObjectURL, revokeObjectURL };
};

describe('import/export service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports multiple types into a zip with friendly values', async () => {
    const db = createMockDb({
      products: [
        {
          id: 'p1',
          name: 'Shirt',
          category: 'c1',
          unit_type: 'unit',
          bulk_name: 'carton',
          barcode: '123',
          archived: false,
          created_at: 1,
          updated_at: 2,
        },
      ],
      categories: [
        { id: 'c1', name: 'Clothing', created_at: 1, updated_at: 2 },
      ],
      areas: [
        { id: 'a1', name: 'Area A', created_at: 1, updated_at: 2 },
      ],
      pickLists: [
        {
          id: 'l1',
          area_id: 'a1',
          created_at: 1,
          completed_at: undefined,
          notes: 'Morning',
          categories: ['c1'],
          auto_add_new_products: false,
        },
      ],
      pickItems: [
        {
          id: 'i1',
          pick_list_id: 'l1',
          product_id: 'p1',
          quantity: 1,
          is_carton: false,
          status: 'pending',
          created_at: 1,
          updated_at: 2,
        },
      ],
    });
    stubDownloads();

    const result = await exportData(db, ['products', 'categories', 'pick-lists', 'pick-items']);
    const zip = await JSZip.loadAsync(result.blob as any);
    const productCsv = await zip.file('products.csv')!.async('string');
    const pickItemsCsv = await zip.file('pickitems.csv')!.async('string');

    expect(productCsv).toContain('Clothing');
    expect(pickItemsCsv).toContain('Shirt');
    expect(db.importExportLogs.items).toHaveLength(1);
  });

  it('imports products while deduplicating by name and auto-creating categories', async () => {
    const db = createMockDb({
      products: [
        {
          id: 'existing',
          name: 'Existing',
          category: 'c1',
          unit_type: 'unit',
          bulk_name: 'carton',
          barcode: '999',
          archived: false,
          created_at: 1,
          updated_at: 1,
        },
      ],
      categories: [{ id: 'c1', name: 'Clothing', created_at: 1, updated_at: 1 }],
    });
    stubDownloads();

    const csvContent = [
      'id,name,category,unit_type,bulk_name,barcode,archived,created_at,updated_at',
      'p2,Existing,Clothing,unit,carton,123,false,,',
      'p3,New Shirt,New Category,unit,carton,124,false,,',
    ].join('\n');
    const csv = { name: 'products.csv', text: async () => csvContent } as unknown as File;

    const result = await importFiles(
      db,
      [csv],
      { allowAutoCreateMissing: true },
      () => undefined,
    );

    expect(result.log.summary.inserted).toBeGreaterThanOrEqual(1);
    expect(db.products.items.find((p) => p.name === 'Existing')).toBeTruthy();
    expect(db.products.items.find((p) => p.name === 'New Shirt')).toBeTruthy();
    expect(db.categories.items.find((c) => c.name === 'New Category')).toBeTruthy();
  });
});
