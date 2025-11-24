import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 4,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        executablePath: process.env.CHROME_PATH,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host --port 4173',
    url: 'http://127.0.0.1:4173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
