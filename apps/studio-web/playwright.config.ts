import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (tests/e2e): the built app (`pnpm test:e2e` builds it first), served on its own port, in Chromium.
 * Unit tests are vitest's (*.test.ts); these are *.e2e.ts so neither runs the other's.
 */
const PORT = 8797;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Big enough that a whole diagram fits at a zoom where nodes can be grabbed
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } } }],
  webServer: {
    command: 'node build/server.js',
    url: `http://localhost:${PORT}/health`,
    // Not one left running from before: it could be serving an older build
    reuseExistingServer: false,
    // Every test calls the MCP endpoint from this machine: more than one person's requests a minute
    env: { PORT: String(PORT), PUBLIC_URL: `http://localhost:${PORT}`, ANALYTICS: 'off', MCP_REQUESTS_PER_MINUTE: '600' },
  },
});
