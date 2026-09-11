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
  await page.goto("/admin/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/admin(?!\/login)/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");

  await page.context().storageState({ path: ADMIN_STATE });
});
