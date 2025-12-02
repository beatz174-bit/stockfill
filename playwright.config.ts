import { defineConfig } from '@playwright/test';
import { defineCoverageReporterConfig } from '@bgotink/playwright-coverage';
import path from 'path';

export default defineConfig({
    reporter: [
    ['list'],
    [
      '@bgotink/playwright-coverage',
      defineCoverageReporterConfig({
        sourceRoot: process.cwd(), // root used to resolve source files
        exclude: ['node_modules/**', 'e2e/**'], // exclude test sources and deps
        resultDir: path.join(process.cwd(), 'coverage-reports/e2e'),
        reports: [
          ['html'], // interactive HTML at results/e2e-coverage/index.html
          ['lcovonly', { file: 'coverage.lcov' }], // LCOV for CI
          ['text-summary', { file: null }], // summary in console
        ],
        // If your source maps produce wrong paths, add rewritePath:
        // rewritePath: ({ absolutePath, relativePath }) => absolutePath
      }),
    ],
  ],
  testDir: './e2e',
  fullyParallel: false,
  workers: 4,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
    navigationTimeout: 60_000,  // 60s for page.goto / navigations
    actionTimeout: 30_000,      // optional: for clicks/typing etc (default 30s)
  },
  webServer: {
    command: 'E2E_COVERAGE=1 npm run dev -- --host --port 4173',
    url: 'http://127.0.0.1:4173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
