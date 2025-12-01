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

  where(field: string) {
    return {
      equals: (val: any) => ({
        first: async () => this.items.find((it: any) => it[field] === val),
        count: async () => this.items.filter((it: any) => it[field] === val).length,
        filter: (pred: (it: any) => boolean) => ({
          first: async () => this.items.find((it: any) => it[field] === val && pred(it)),
        }),
      }),
    };
  }

  filter(pred: (it: any) => boolean) {
    const filtered = this.items.filter(pred);
    return {
      delete: async () => {
        this.items = this.items.filter((it) => !pred(it));
      },
      first: async () => filtered[0],
    };
  }
}

export const createMockDb = (data?: any) => {
  return {
    products: new MockTable(data?.products ?? []),
    categories: new MockTable(data?.categories ?? []),
    areas: new MockTable(data?.areas ?? []),
    pickLists: new MockTable(data?.pickLists ?? []),
    pickItems: new MockTable(data?.pickItems ?? []),
    importExportLogs: new MockTable<any>([]),
    transaction: async (_mode: string, ...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') return cb();
      return undefined;
    },
  };
};
