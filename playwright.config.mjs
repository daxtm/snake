import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
