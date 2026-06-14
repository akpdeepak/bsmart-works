import { defineConfig, devices } from '@playwright/test';

// E2E config for the Sprint Cockpit (Cap V). The suite drives a REAL browser against the
// running app; bring up the stack first (see e2e/README.md). All endpoints/credentials are
// env-overridable so the same suite runs locally and in CI (.github/workflows/e2e.yml).
//
// E2E_BASE_URL  — frontend origin (default Vite dev server)
// E2E_API_URL   — backend API base (default local Spring Boot)
// E2E_EMAIL / E2E_PASSWORD — a loginable workspace member (see README for provisioning)
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Start the Vite dev server unless one is already running (or a base URL is supplied).
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
