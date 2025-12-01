import { describe, expect, it, vi } from 'vitest';
import { exportData } from '../importExportService';
import { createMockDb } from '../../testUtils/mockDb';
import { stubDownloads } from '../../testUtils/stubDownloads';

describe('exportData single file', () => {
  it('exports a single csv and logs download', async () => {
    const db = createMockDb({
      products: [
        {
          id: 'p1',
          name: 'Test Product',
          category: 'c1',
          unit_type: 'unit',
          bulk_name: 'carton',
          barcode: '123',
          archived: false,
          created_at: 1,
          updated_at: 1,
        },
      ],
      categories: [{ id: 'c1', name: 'Snacks', created_at: 1, updated_at: 1 }],
    });

    const download = stubDownloads(vi);

    const result = await exportData(db as any, ['products']);

    expect(result.fileName).toBe('products.csv');
    expect(download.createObjectURL).toHaveBeenCalled();
    expect((db.importExportLogs as any).items).toHaveLength(1);
  });
});
