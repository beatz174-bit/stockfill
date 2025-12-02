// tests/playwright-collect-coverage.js
const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

test.afterEach(async ({ page }) => {
  try {
    // evaluate coverage from the page
    const coverage = await page.evaluate(() => (globalThis.__coverage__ || {}));
    if (coverage && Object.keys(coverage).length) {
      const dir = path.join(process.cwd(), 'coverage-reports', 'e2e', '.nyc_output');
      fs.mkdirSync(dir, { recursive: true });

      // unique file per worker/test
      const filename = path.join(dir, `coverage-e2e-${process.pid}-${Date.now()}.json`);
      fs.writeFileSync(filename, JSON.stringify(coverage));
      console.log('Wrote coverage:', filename);
    }
  } catch (err) {
    // don't fail tests if coverage collection fails
    console.warn('Failed to collect coverage from page:', err.message || err);
  }
});
