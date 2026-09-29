import { expect, test as setup } from "@playwright/test";

/**
 * Signs in once and saves the session for every admin test to reuse.
 *
 * Logging in per test would trip the panel's own login rate limit (10 attempts
 * per 15 minutes per IP) part-way through a full desktop + mobile run — the
 * limiter is doing its job, so the suite adapts instead of weakening it.
 */
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mymensinghultrasound@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

setup("authenticate as admin", async ({ page }) => {
  // The warm-up below compiles every route the suite touches, which on a cold
  // dev server is minutes rather than seconds. Paying it here is the point; it
  // just must not be charged against the default one-minute budget.
  setup.setTimeout(10 * 60_000);

  await page.goto("/admin/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/admin(?!\/login)/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");

  await page.context().storageState({ path: ADMIN_STATE });

  await warmRoutes(page);
});

/**
 * Visits each route once so the dev server compiles it before any test needs
 * it.
 *
 * Next aborts the navigation that arrives while it is still building a route
 * ("net::ERR_ABORTED"), which shows up as a different test failing on each
 * run and looks like a fault in whatever was unlucky. Paying the compile cost
 * once here, in setup, is cheaper than retry loops in twenty specs.
 */
async function warmRoutes(page: import("@playwright/test").Page) {
  const routes = [
    "/admin",
    "/admin/applications",
    "/admin/students",
    "/admin/students/new",
    "/admin/courses",
    "/admin/courses/new",
    "/admin/board-exams",
    "/admin/board-exams/new",
    "/admin/certificates",
    "/admin/certificates/issue",
    "/admin/certificates/register",
    "/admin/messages",
    "/admin/import",
    "/admin/settings",
    "/admin/media",
    "/admin/analytics",
    "/admin/gallery",
    "/admin/videos",
    "/admin/promos",
    "/",
    "/courses",
    "/apply",
    "/blog",
    "/verify",
    "/results",
    "/bn",
    "/bn/courses",
  ];

  for (const route of routes) {
    // An abort here is exactly what this loop exists to absorb, so a failed
    // warm-up is retried once and then left to the test that needs it.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        break;
      } catch {
        /* try once more, then move on */
      }
    }
  }
}
