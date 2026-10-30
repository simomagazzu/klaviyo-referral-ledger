import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 *
 * Tests live in the `e2e/` directory.
 * Run on demand — never automatically as part of the build.
 *
 * Commands:
 *   pnpm test:e2e          → run all tests headlessly
 *   pnpm test:e2e:ui       → open the Playwright interactive UI
 *   pnpm test:e2e:headed   → watch the browser while tests run
 *
 * First-time setup (run once after `pnpm install`):
 *   pnpm exec playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in source
  forbidOnly: !!process.env.CI,

  // Retry failed tests twice on CI, never locally
  retries: process.env.CI ? 2 : 0,

  // Limit workers on CI to avoid resource exhaustion
  workers: process.env.CI ? 1 : undefined,

  // HTML report saved to playwright-report/
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",

    // Attach a trace to failed tests — open with: pnpm exec playwright show-trace
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment to also test in Firefox and WebKit:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    // Reuse the already-running dev server locally; start a fresh one on CI
    reuseExistingServer: !process.env.CI,
  },
});
