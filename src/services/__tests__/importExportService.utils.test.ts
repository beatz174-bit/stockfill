import { describe, expect, it } from 'vitest';
import { normalizeName, inferTypeFromName } from '../../utils/stringUtils';
import { coerceBoolean, coerceNumber } from '../../utils/convUtils';

describe('import/export utils', () => {
  it('normalizes names and preserves empty as empty string', () => {
    expect(normalizeName('  Hello   WORLD  ')).toBe('hello world');
    expect(normalizeName(undefined)).toBe('');
  });

  it('infers data type from filenames', () => {
    expect(inferTypeFromName('products.csv')).toBe('products');
    expect(inferTypeFromName('pickitems.csv')).toBe('pick-items');
    expect(inferTypeFromName('unknown.txt')).toBeUndefined();
  });

  it('coerces booleans correctly', () => {
    expect(coerceBoolean('true')).toBe(true);
    expect(coerceBoolean('false')).toBe(false);
    expect(coerceBoolean(true)).toBe(true);
    expect(coerceBoolean(undefined)).toBe(false);
  });

  it('coerces numbers with fallback to zero', () => {
    expect(coerceNumber('123')).toBe(123);
    expect(coerceNumber(42)).toBe(42);
    expect(coerceNumber('not-a-number')).toBe(0);
    expect(coerceNumber(undefined)).toBe(0);
  });
});
