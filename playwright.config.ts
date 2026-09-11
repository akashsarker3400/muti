import { defineConfig, devices } from "@playwright/test";

/** Relative to the project root, which is where Playwright runs. */
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

/**
 * Smoke tests (section 11). They run against a real dev server and a real
 * database, so `npm run db:seed` must have been run first.
 *
 * The `setup` project signs in once and shares the session with every other
 * project, which keeps the run under the admin login rate limit.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    locale: "en-US",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: ADMIN_STATE },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], storageState: ADMIN_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
