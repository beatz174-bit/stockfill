import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import { expect, test as base, Page } from '@bgotink/playwright-coverage';

const coverageDir = path.join(process.cwd(), 'coverage-reports', 'e2e', '.nyc_output');

async function writeCoverageFile(page: Page, testInfo: TestInfo) {
  try {
    const coverage = await page.evaluate(() => (globalThis as any).__coverage__ ?? null);
    if (!coverage || Object.keys(coverage).length === 0) return;

    await fs.mkdir(coverageDir, { recursive: true });

    const titleParts =
      typeof testInfo.titlePath === 'function'
        ? testInfo.titlePath()
        : Array.isArray((testInfo as any).titlePath)
          ? (testInfo as any).titlePath
          : [testInfo.title];
    const safeTitle = titleParts
      .filter(Boolean)
      .map((part) => part.replace(/[^a-zA-Z0-9-_]+/g, '_'))
      .join('--')
      .slice(0, 200);
    const worker = typeof testInfo.workerIndex === 'number' ? `w${testInfo.workerIndex}` : 'w';
    const filename = path.join(coverageDir, `coverage-${worker}-${Date.now()}-${safeTitle || 'test'}.json`);

    await fs.writeFile(filename, JSON.stringify(coverage));
    console.log('Wrote coverage file:', path.relative(process.cwd(), filename));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Failed to collect coverage from page:', msg);
  }
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    await writeCoverageFile(page, testInfo);
  },
});

export { expect };
export type { Page };
