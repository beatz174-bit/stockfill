import { describe, expect, it } from 'vitest';
import { dedupeByIdThenNameAndSort, normalizeName } from '../activePickListUtils';
import { Product } from '../../models/Product';

describe('activePickListUtils', () => {
  it('normalizes name by trimming and lowercasing', () => {
    expect(normalizeName('  Hello ')).toBe('hello');
  });

  it('dedupes by id, then name, and sorts', () => {
    const products: Product[] = [
      {
        id: '1',
        name: 'Banana',
        category: 'c',
        unit_type: 'unit',
        bulk_name: 'carton',
        archived: false,
        created_at: 0,
        updated_at: 1,
      },
      {
        id: '1',
        name: 'Banana newer',
        category: 'c',
        unit_type: 'unit',
        bulk_name: 'carton',
        archived: false,
        created_at: 0,
        updated_at: 2,
      },
      {
        id: '2',
        name: ' apple',
        category: 'c',
        unit_type: 'unit',
        bulk_name: 'carton',
        archived: false,
        created_at: 0,
        updated_at: 1,
      },
      {
        id: '3',
        name: 'Apple ',
        category: 'c',
        unit_type: 'unit',
        bulk_name: 'carton',
        archived: false,
        created_at: 0,
        updated_at: 3,
      },
    ];

    const result = dedupeByIdThenNameAndSort(products);

    expect(result).toHaveLength(2);
    expect(result.some((p) => p.name === 'Banana newer')).toBe(true);
    expect(result.find((p) => normalizeName(p.name) === 'apple')?.updated_at).toBe(3);
    expect(result[0].name.toLowerCase().trim()).toBe('apple');
    expect(result[1].name.toLowerCase().includes('banana')).toBe(true);
  });

  it('returns empty array for no products', () => {
    expect(dedupeByIdThenNameAndSort([])).toEqual([]);
  });
});
