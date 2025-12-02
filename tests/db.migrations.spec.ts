import { describe, expect, test, vi, beforeEach } from 'vitest';
import { makeMockDb } from './utils/mockDb';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

describe('applyMigrations', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('creates category for product name and updates product to use new id', async () => {
    const db = makeMockDb();
    (db.categories.toArray as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'mock-uuid', name: 'Beverages', created_at: 1, updated_at: 1 }]);
    (db.products.toArray as any).mockResolvedValueOnce([
      { id: 'p1', category: 'Beverages', name: 'Cola' },
    ]);

    const { applyMigrations } = await import('../src/db/migrations');
    await applyMigrations(db as any);

    expect(db.categories.add).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mock-uuid', name: 'Beverages' }),
    );
    expect(db.products.update).toHaveBeenCalledWith('p1', { category: 'mock-uuid' });
  });

  test('skips update when product category already matches existing id', async () => {
    const db = makeMockDb();
    (db.categories.toArray as any)
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Snacks' }])
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Snacks' }]);
    (db.products.toArray as any).mockResolvedValueOnce([
      { id: 'p2', category: 'cat-1', name: 'Chips' },
    ]);

    const { applyMigrations } = await import('../src/db/migrations');
    await applyMigrations(db as any);

    expect(db.categories.add).not.toHaveBeenCalled();
    expect(db.products.update).not.toHaveBeenCalled();
  });

  test('normalizes pickList categories names to ids', async () => {
    const db = makeMockDb();
    (db.categories.toArray as any)
      .mockResolvedValueOnce([{ id: 'cat-fruit', name: 'Fruit' }])
      .mockResolvedValueOnce([{ id: 'cat-fruit', name: 'Fruit' }]);
    (db.products.toArray as any).mockResolvedValueOnce([]);
    (db.pickLists.toArray as any).mockResolvedValueOnce([
      { id: 'pl-1', categories: ['Fruit'] },
    ]);

    const { applyMigrations } = await import('../src/db/migrations');
    await applyMigrations(db as any);

    expect(db.pickLists.update).toHaveBeenCalledWith('pl-1', { categories: ['cat-fruit'] });
  });
});
