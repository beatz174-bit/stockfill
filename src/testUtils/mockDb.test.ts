// src/testUtils/mockDb.test.ts
import { describe, it, expect } from 'vitest';
import { MockTable, createMockDb } from './mockDb';

type Item = { id: string; category?: string; name?: string };

describe('MockTable basic operations', () => {
  it('supports toArray, add, get, put (update + insert) and delete', async () => {
    const t = new MockTable<Item>([{ id: 'a', name: 'alpha' }]);

    // toArray
    expect(await t.toArray()).toHaveLength(1);

    // add
    await t.add({ id: 'b', name: 'beta' });
    expect((await t.toArray()).map((i) => i.id)).toContain('b');

    // get
    expect((await t.get('b'))?.name).toBe('beta');

    // put (update)
    await t.put({ id: 'a', name: 'alpha-updated' });
    expect((await t.get('a'))?.name).toBe('alpha-updated');

    // put (insert)
    await t.put({ id: 'c', name: 'gamma' });
    expect((await t.toArray()).map((i) => i.id)).toContain('c');

    // delete
    await t.delete('b');
    expect(await t.get('b')).toBeUndefined();
  });

  it('where().equals().first / count / filter works and filter.delete removes items', async () => {
    const t = new MockTable<Item>([
      { id: '1', category: 'x' },
      { id: '2', category: 'x' },
      { id: '3', category: 'y' },
    ]);

    // first
    const firstX = await t.where('category').equals('x').first();
    expect(firstX?.id).toBe('1');

    // count
    const countX = await t.where('category').equals('x').count();
    expect(countX).toBe(2);

    // equals(...).filter(...).first()
    const filteredFirst = await t.where('category').equals('x').filter((it: any) => it.id === '2').first();
    expect(filteredFirst?.id).toBe('2');

    // filter(pred).delete() and filter(...).first()
    const before = await t.toArray();
    expect(before.some((i) => i.category === 'y')).toBeTruthy();

    const f = t.filter((it: any) => it.category === 'y');
    await f.delete();
    const after = await t.toArray();
    expect(after.some((i) => i.category === 'y')).toBeFalsy();
  });

  it('transaction executes callback when provided and returns undefined otherwise', async () => {
    const db = createMockDb({});
    let called = false;
    await db.transaction('rw', async () => {
      called = true;
    });
    expect(called).toBe(true);

    // when last arg isn't a function, it should resolve and return undefined
    const res = await db.transaction('rw');
    expect(res).toBeUndefined();
  });
});
