import { vi } from 'vitest';

export type TableMock<T = any> = {
  toArray: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

const createWhere = () => ({
  equals: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) }),
});

export const makeTableMock = <T = any>(items: T[] = []): TableMock<T> => ({
  toArray: vi.fn().mockResolvedValue([...items]),
  add: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  where: vi.fn().mockImplementation(() => createWhere()),
  filter: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) }),
  count: vi.fn().mockResolvedValue(0),
});

export const makeMockDb = (overrides: Partial<Record<string, any>> = {}) => {
  const products = makeTableMock(overrides.products ?? []);
  const categories = makeTableMock(overrides.categories ?? []);
  const pickLists = makeTableMock(overrides.pickLists ?? []);
  const pickItems = makeTableMock(overrides.pickItems ?? []);
  const importExportLogs = makeTableMock(overrides.importExportLogs ?? []);

  const transaction = vi
    .fn()
    .mockImplementation(async (_mode: any, ...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        return cb();
      }
      return undefined;
    });

  const open = vi.fn().mockResolvedValue(undefined);

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
