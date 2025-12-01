// src/services/importExportService.additional.test.ts
import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { importFiles } from './importExportService';
import { createMockDb } from '../testUtils/mockDb';

describe('importExportService - readFiles and parse branches', () => {
  it('skips a non-product, unrecognized filename inside a zip', async () => {
    const zip = new JSZip();
    zip.file('weird.csv', 'id,foo\n1,bar');
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'upload.zip', { type: 'application/zip' });

    const db = createMockDb({
      products: [],
      categories: [],
      areas: [],
      pickLists: [],
      pickItems: [],
    });

    const result = await importFiles(db as any, [file], { allowAutoCreateMissing: true }, () => undefined);

    // ensure details include a skipped message for weird.csv
    const hasSkip = result.log.details.some((d) => d.toLowerCase().includes('skipped') && d.toLowerCase().includes('weird.csv'));
    expect(hasSkip).toBeTruthy();
  });

  it('parseCsv throws for malformed CSV content', async () => {
    const badFile = new File(['"unclosed_field,category\nval1,cat1'], 'bad.csv', { type: 'text/csv' });

    const db = createMockDb({
      products: [],
      categories: [],
      areas: [],
      pickLists: [],
      pickItems: [],
    });

    await expect(importFiles(db as any, [badFile], { allowAutoCreateMissing: true }, () => undefined)).rejects.toThrow();
  });
});
