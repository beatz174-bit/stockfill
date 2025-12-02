// src/testUtils/mockDb.ts
import type { Product } from '../models/Product';
import type { Category } from '../models/Category';
import type { Area } from '../models/Area';
import type { PickList } from '../models/PickList';
import type { PickItem } from '../models/PickItem';
import type { ImportExportLog } from '../models/ImportExportLog';

export class MockTable<T extends { id: string }> {
  items: T[];

  constructor(items: T[] = []) {
    this.items = items.slice();
  }

  async toArray() {
    return [...this.items];
  }

  async add(item: T) {
    this.items.push(item);
    return item.id;
  }

  async get(id: string) {
    return this.items.find((i) => i.id === id);
  }

  async put(item: T) {
    const idx = this.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      this.items[idx] = item;
    } else {
      this.items.push(item);
    }
    return item.id;
  }

  async delete(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  where<K extends keyof T>(field: K) {
    return {
      equals: (val: T[K]) => ({
        first: async () => this.items.find((it) => it[field] === val),
        count: async () => this.items.filter((it) => it[field] === val).length,
        filter: (pred: (it: T) => boolean) => ({
          first: async () => this.items.find((it) => it[field] === val && pred(it)),
        }),
      }),
    };
  }

  filter(pred: (it: T) => boolean) {
    const filtered = this.items.filter(pred);
    return {
      delete: async () => {
        this.items = this.items.filter((it) => !pred(it));
      },
      first: async () => filtered[0],
    };
  }
}

export const createMockDb = (data?: {
  products?: Product[];
  categories?: Category[];
  areas?: Area[];
  pickLists?: PickList[];
  pickItems?: PickItem[];
  importExportLogs?: ImportExportLog[];
}) => {
  return {
    products: new MockTable<Product>(data?.products ?? []),
    categories: new MockTable<Category>(data?.categories ?? []),
    areas: new MockTable<Area>(data?.areas ?? []),
    pickLists: new MockTable<PickList>(data?.pickLists ?? []),
    pickItems: new MockTable<PickItem>(data?.pickItems ?? []),
    importExportLogs: new MockTable<ImportExportLog>(data?.importExportLogs ?? []),
    transaction: async (
      _mode: string,
      ...args: Array<MockTable<{ id: string }> | (() => unknown)>
    ) => {
      const cb = args.at(-1);
      if (typeof cb === 'function') return cb();
      return undefined;
    },
  };
};
