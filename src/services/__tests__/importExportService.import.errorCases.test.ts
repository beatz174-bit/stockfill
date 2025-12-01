import Papa from 'papaparse';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { importFiles } from '../importExportService';
import { createMockDb } from '../../testUtils/mockDb';

const emptyNameCsv = ['name,category,barcode', ',,'].join('\n');

const createFile = (name: string, content: string) => ({
  name,
  text: async () => content,
}) as unknown as File;

describe('importFiles error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when CSV parsing reports errors', async () => {
    vi.spyOn(Papa, 'parse').mockReturnValue({ data: [], errors: [{ message: 'parse error' }] } as any);
    const db = createMockDb();
    await expect(importFiles(db as any, [createFile('products.csv', '')], { allowAutoCreateMissing: true })).rejects.toThrow(
      /parse error/,
    );
  });

  it('logs skipped product rows with empty names', async () => {
    const db = createMockDb();
    const result = await importFiles(db as any, [createFile('products.csv', emptyNameCsv)], {
      allowAutoCreateMissing: true,
    });
    expect(result.log.details.some((line) => line.includes('Skipped product with empty name'))).toBe(true);
    expect(result.log.summary.skipped).toBeGreaterThanOrEqual(1);
  });
});
