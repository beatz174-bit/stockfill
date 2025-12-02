import { vi } from 'vitest';

type WhereClause<T> = {
  equals: ReturnType<typeof vi.fn<[T], { first: ReturnType<typeof vi.fn<[], Promise<T | undefined>>> }>>;
};

type FilterClause<T> = {
  first: ReturnType<typeof vi.fn<[], Promise<T | undefined>>>;
};

export type TableMock<T = unknown> = {
  toArray: ReturnType<typeof vi.fn<[], Promise<T[]>>>;
  add: ReturnType<typeof vi.fn<[T], Promise<unknown>>>;
  update: ReturnType<typeof vi.fn<[string, Partial<T>], Promise<unknown>>>;
  where: ReturnType<typeof vi.fn<[keyof T], WhereClause<T[keyof T]>>>;
  filter: ReturnType<typeof vi.fn<[(item: T) => boolean], FilterClause<T>>>;
  count: ReturnType<typeof vi.fn<[], Promise<number>>>;
};

const createWhere = <T>(): WhereClause<T> => ({
  equals: vi.fn<[T], { first: ReturnType<typeof vi.fn<[], Promise<T | undefined>>> }>().mockReturnValue({
    first: vi.fn<[], Promise<T | undefined>>().mockResolvedValue(undefined),
  }),
});

export const makeTableMock = <T = unknown>(items: T[] = []): TableMock<T> => ({
  toArray: vi.fn<[], Promise<T[]>>().mockResolvedValue([...items]),
  add: vi.fn<[T], Promise<unknown>>().mockResolvedValue(undefined),
  update: vi.fn<[string, Partial<T>], Promise<unknown>>().mockResolvedValue(undefined),
  where: vi.fn<[keyof T], WhereClause<T[keyof T]>>().mockImplementation(() => createWhere<T[keyof T]>()),
  filter: vi
    .fn<[(item: T) => boolean], FilterClause<T>>()
    .mockReturnValue({ first: vi.fn<[], Promise<T | undefined>>().mockResolvedValue(undefined) }),
  count: vi.fn<[], Promise<number>>().mockResolvedValue(0),
});

type MockDbOverrides = {
  products: unknown[];
  categories: unknown[];
  pickLists: unknown[];
  pickItems: unknown[];
  importExportLogs: unknown[];
};

type TransactionMock = ReturnType<typeof vi.fn<[string, ...unknown[]], Promise<unknown>>>;

type MockDb = {
  products: TableMock;
  categories: TableMock;
  pickLists: TableMock;
  pickItems: TableMock;
  importExportLogs: TableMock;
  transaction: TransactionMock;
  open: ReturnType<typeof vi.fn<[], Promise<unknown>>>;
};

export const makeMockDb = (overrides: Partial<MockDbOverrides> = {}): MockDb => {
  const products = makeTableMock(overrides.products ?? []);
  const categories = makeTableMock(overrides.categories ?? []);
  const pickLists = makeTableMock(overrides.pickLists ?? []);
  const pickItems = makeTableMock(overrides.pickItems ?? []);
  const importExportLogs = makeTableMock(overrides.importExportLogs ?? []);

  const transaction = vi.fn<[string, ...unknown[]], Promise<unknown>>().mockImplementation(
    async (_mode, ...args) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        return cb();
      }
      return undefined;
    },
  );

  const open = vi.fn<[], Promise<unknown>>().mockResolvedValue(undefined);

  return {
    products,
    categories,
    pickLists,
    pickItems,
    importExportLogs,
    transaction,
    open,
  };
};
