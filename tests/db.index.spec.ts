import { describe, expect, test, vi, beforeEach } from 'vitest';

const makeDexieMock = () => {
  const version = vi.fn().mockReturnThis();
  const stores = vi.fn().mockReturnThis();
  const upgrade = vi.fn().mockReturnThis();
  const table = vi.fn().mockReturnValue({
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
    bulkAdd: vi.fn(),
  });

  class MockDexie {
    version = version;
    stores = stores;
    upgrade = upgrade;
    table = table;
    constructor() {}
  }

  return { MockDexie, version };
};

describe('db/index initializeDatabase', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('initializeDatabase calls applyMigrations with db', async () => {
    const { MockDexie } = makeDexieMock();
    const applyMigrations = vi.fn().mockResolvedValue(undefined);

    vi.mock('dexie', () => ({ default: MockDexie, Dexie: MockDexie, Table: class {} }));
    vi.mock('../src/db/migrations', () => ({ applyMigrations }));

    const { initializeDatabase, db } = await import('../src/db');
    await initializeDatabase();

    expect(applyMigrations).toHaveBeenCalledWith(db);
  });

  test('initializeDatabase rejects when applyMigrations fails', async () => {
    const { MockDexie } = makeDexieMock();
    const applyMigrations = vi.fn().mockRejectedValue(new Error('fail'));

    vi.mock('dexie', () => ({ default: MockDexie, Dexie: MockDexie, Table: class {} }));
    vi.mock('../src/db/migrations', () => ({ applyMigrations }));

    const { initializeDatabase } = await import('../src/db');

    await expect(initializeDatabase()).rejects.toThrow('fail');
  });

  test('StockFillDB sets up versions on construction', async () => {
    const { MockDexie, version } = makeDexieMock();
    vi.mock('dexie', () => ({ default: MockDexie, Dexie: MockDexie, Table: class {} }));
    vi.mock('../src/db/migrations', () => ({ applyMigrations: vi.fn() }));

    const { db } = await import('../src/db');

    expect(version).toHaveBeenCalled();
    expect((version as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(db).toBeDefined();
  });
});
