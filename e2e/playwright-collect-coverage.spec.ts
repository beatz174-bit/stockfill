// e2e/playwright-collect-coverage.spec.ts
import fs from 'fs';
import path from 'path';
import { test } from '@playwright/test';

const EVAL_TIMEOUT_MS = 5000;
const WRITE_TIMEOUT_MS = 15000;

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout?: () => void) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((res) => {
    timer = setTimeout(() => {
      onTimeout?.();
      // @ts-ignore resolve null on timeout
      res(null);
    }, ms);
  });
  return Promise.race([p, timeout]).then((r) => {
    if (timer) clearTimeout(timer);
    return r;
  });
}

test.afterEach(async ({ page }, testInfo) => {
  try {
    console.log(`Collecting coverage for: ${testInfo.title}`);

    // Evaluate coverage in page, but don't hang forever
    const evalPromise = page.evaluate(() => (globalThis as any).__coverage__ || null);
    const coverage = await withTimeout(evalPromise, EVAL_TIMEOUT_MS, () => {
      console.warn('page.evaluate for coverage timed out');
    });

    if (!coverage || Object.keys(coverage).length === 0) {
      console.log('No coverage collected (empty or timed out).');
      return;
    }

    const dir = path.join(process.cwd(), '.nyc_output');
    await fs.promises.mkdir(dir, { recursive: true });

    const safeTitle = (testInfo.title || 'test').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 120);
    const worker = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : process.pid;
    const filename = path.join(dir, `coverage-e2e-w${worker}-${Date.now()}-${safeTitle}.json`);

    // write asynchronously, bounded by timeout
    const writePromise = fs.promises.writeFile(filename, JSON.stringify(coverage));
    await withTimeout(writePromise, WRITE_TIMEOUT_MS, () => {
      console.warn('Writing coverage file timed out');
    });

    console.log('Wrote coverage:', filename);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Failed to collect coverage from page:', msg);
  }
});
