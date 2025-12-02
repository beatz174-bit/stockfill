import { describe, expect, test, vi, beforeEach } from 'vitest';

const setupDexieMock = () => {
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

  vi.doMock('dexie', () => ({ default: MockDexie, Dexie: MockDexie, Table: class {} }));

  return { MockDexie, version };
};

describe('db/index initializeDatabase', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('initializeDatabase calls applyMigrations with db', async () => {
    setupDexieMock();
    const applyMigrations = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/db/migrations', () => ({ applyMigrations }));

    const { initializeDatabase, db } = await import('../../src/db');
    await initializeDatabase();

    expect(applyMigrations).toHaveBeenCalledWith(db);
  });

  test('initializeDatabase rejects when applyMigrations fails', async () => {
    setupDexieMock();
    const applyMigrations = vi.fn().mockRejectedValue(new Error('fail'));

    vi.doMock('../../src/db/migrations', () => ({ applyMigrations }));

    const { initializeDatabase } = await import('../../src/db');

    await expect(initializeDatabase()).rejects.toThrow('fail');
  });

  test('StockFillDB sets up versions on construction', async () => {
    const { version } = setupDexieMock();
    vi.doMock('../../src/db/migrations', () => ({ applyMigrations: vi.fn() }));

    const { db } = await import('../../src/db');

    expect(version).toHaveBeenCalled();
    expect(version.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(db).toBeDefined();
  });
});
