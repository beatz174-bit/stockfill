import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

import { initializeDatabase, StockFillDB, db } from './index';
import { applyMigrations } from './migrations';
import { PickItem } from '../models/PickItem';
import { PickList } from '../models/PickList';

vi.mock('dexie', () => {
  type VersionRecord = {
    versionNumber: number;
    schema?: Record<string, string>;
    upgradeFn?: (tx: any) => Promise<void> | void;
  };

  const instances: DexieMock[] = [];

  class DexieMock {
    public versionCalls: VersionRecord[] = [];
    public name: string;

    constructor(name: string) {
      this.name = name;
      instances.push(this);
    }

    version(versionNumber: number) {
      const record: VersionRecord = { versionNumber };
      this.versionCalls.push(record);

      const chain = {
        stores: (schema: Record<string, string>) => {
          record.schema = schema;
          return chain;
        },
        upgrade: (upgradeFn: (tx: any) => Promise<void> | void) => {
          record.upgradeFn = upgradeFn;
          return chain;
        },
      } as const;

      return chain;
    }

    static get instances() {
      return instances;
    }
  }

  class TableMock {}

  return { default: DexieMock, Table: TableMock };
});

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

vi.mock('./migrations', () => ({
  applyMigrations: vi.fn(),
}));

type TableWithRows<T> = {
  rows: T[];
  count: ReturnType<typeof vi.fn>;
  toArray: ReturnType<typeof vi.fn>;
  bulkAdd: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
};

const createTable = <T>(rows: T[]): TableWithRows<T> => ({
  rows,
  count: vi.fn(async () => rows.length),
  toArray: vi.fn(async () => [...rows]),
  bulkAdd: vi.fn(async (items: T[]) => {
    rows.push(...items);
  }),
  update: vi.fn(async (id: string, data: Partial<T>) => {
    const index = rows.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      rows[index] = { ...rows[index], ...data } as T;
    }
  }),
  add: vi.fn(async (item: T) => {
    rows.push(item);
  }),
});

const createTx = (tables: Record<string, TableWithRows<any>>) => ({
  table: (name: string) => {
    const table = tables[name];
    if (!table) throw new Error(`Table ${name} not found`);
    return table;
  },
});

const getVersion = (database: StockFillDB, versionNumber: number) => {
  const version = (database as unknown as { versionCalls: { versionNumber: number; upgradeFn?: (tx: any) => Promise<void> | void }[] })
    .versionCalls.find((entry) => entry.versionNumber === versionNumber);

  if (!version || !version.upgradeFn) throw new Error(`Version ${versionNumber} not found`);
  return version.upgradeFn;
};

beforeEach(() => {
  vi.clearAllMocks();
  (Dexie as unknown as { instances: Dexie[] }).instances?.splice?.(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StockFillDB migrations', () => {
  it('seeds categories from existing products when the table is empty', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    (uuidv4 as unknown as Mock).mockImplementation(() => `uuid-${(uuidv4 as Mock).mock.calls.length + 1}`);

    const database = new StockFillDB();
    const upgrade = getVersion(database, 2);

    const products = createTable([
      { id: 'p1', category: 'Chips' },
      { id: 'p2', category: 'Drinks' },
      { id: 'p3', category: 'Chips' },
    ] as any);
    const categories = createTable<any>([]);
    const tx = createTx({ products, categories });

    await upgrade(tx);

    expect(categories.bulkAdd).toHaveBeenCalledTimes(1);
    expect(categories.rows).toHaveLength(2);
    expect(categories.rows).toEqual(
      expect.arrayContaining([
        {
          id: expect.stringMatching(/^uuid-/),
          name: 'Chips',
          created_at: now,
          updated_at: now,
        },
        {
          id: expect.stringMatching(/^uuid-/),
          name: 'Drinks',
          created_at: now,
          updated_at: now,
        },
      ]),
    );
  });

  it('removes duplicated barcodes while keeping the first occurrence', async () => {
    const now = 1_700_000_100_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const database = new StockFillDB();
    const upgrade = getVersion(database, 3);

    const products = createTable([
      { id: 'p1', barcode: '123', updated_at: 1 },
      { id: 'p2', barcode: '456', updated_at: 1 },
      { id: 'p3', barcode: '123', updated_at: 1 },
    ] as any);
    const tx = createTx({ products });

    await upgrade(tx);

    expect(products.update).toHaveBeenCalledWith('p3', { barcode: undefined, updated_at: now });
    expect(products.update).toHaveBeenCalledTimes(1);
  });

  it('transforms legacy pick item quantities and duplicates mixed records', async () => {
    const now = 1_700_000_200_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    (uuidv4 as unknown as Mock).mockReturnValue('new-carton-id');

    const database = new StockFillDB();
    const upgrade = getVersion(database, 5);

    const pickItems = createTable([
      { id: 'new-format', quantity: 2, is_carton: true, updated_at: 1 } as PickItem,
      {
        id: 'legacy-mixed',
        pick_list_id: 'pl-1',
        product_id: 'prod-1',
        status: 'pending',
        created_at: 10,
        updated_at: 20,
        quantity_units: 2,
        quantity_bulk: 3,
      } as any,
      {
        id: 'legacy-bulk',
        pick_list_id: 'pl-1',
        product_id: 'prod-2',
        status: 'pending',
        updated_at: 20,
        quantity_bulk: 5,
      } as any,
      {
        id: 'legacy-units',
        pick_list_id: 'pl-2',
        product_id: 'prod-3',
        status: 'picked',
        updated_at: 20,
        quantity_units: 7,
      } as any,
    ]);

    const tx = createTx({ pickItems });

    await upgrade(tx);

    expect(pickItems.update).toHaveBeenCalledWith('legacy-mixed', {
      quantity: 2,
      is_carton: false,
      updated_at: now,
    });
    expect(pickItems.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-carton-id',
        quantity: 3,
        is_carton: true,
        updated_at: now,
      }),
    );
    expect(pickItems.update).toHaveBeenCalledWith('legacy-bulk', {
      quantity: 5,
      is_carton: true,
      updated_at: now,
    });
    expect(pickItems.update).toHaveBeenCalledWith('legacy-units', {
      quantity: 7,
      is_carton: false,
      updated_at: now,
    });
  });

  it('fills missing quantity fields and removes legacy ones in pick items', async () => {
    const now = 1_700_000_300_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const database = new StockFillDB();
    const upgrade = getVersion(database, 6);

    const pickItems = createTable([
      { id: 'has-all', quantity: 1, is_carton: false } as PickItem,
      { id: 'units-only', quantity_units: 4 } as any,
      { id: 'bulk-only', quantity_bulk: 2 } as any,
    ]);

    const tx = createTx({ pickItems });

    await upgrade(tx);

    expect(pickItems.update).toHaveBeenCalledWith('units-only', {
      quantity: 4,
      is_carton: false,
      quantity_units: undefined,
      updated_at: now,
    });
    expect(pickItems.update).toHaveBeenCalledWith('bulk-only', {
      quantity: 2,
      is_carton: true,
      quantity_bulk: undefined,
      updated_at: now,
    });
    expect(pickItems.update).toHaveBeenCalledTimes(2);
  });

  it('backfills pick list defaults when categories or auto-add flags are missing', async () => {
    const database = new StockFillDB();
    const upgrade = getVersion(database, 7);

    const pickLists = createTable([
      { id: 'valid', categories: ['a'], auto_add_new_products: true } as PickList,
      { id: 'missing-fields', categories: undefined, auto_add_new_products: undefined } as any,
    ]);

    const tx = createTx({ pickLists });

    await upgrade(tx);

    expect(pickLists.update).toHaveBeenCalledWith('missing-fields', {
      categories: [],
      auto_add_new_products: false,
    });
    expect(pickLists.update).toHaveBeenCalledTimes(1);
  });
});

describe('initializeDatabase', () => {
  it('calls applyMigrations with the shared db instance', async () => {
    (applyMigrations as unknown as Mock).mockResolvedValue(undefined);

    await initializeDatabase();

    expect(applyMigrations).toHaveBeenCalledWith(db);
  });
});
