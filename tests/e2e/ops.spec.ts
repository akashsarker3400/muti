import { expect, request as playwrightRequest, test } from "@playwright/test";

/**
 * Operations (addendum 2, A6): the visitor counter and the database backup.
 *
 * The backup test runs a real `pg_dump`, so it is skipped on a machine that
 * has no Postgres client rather than failing for something that is not the
 * code's fault.
 */

test.describe("visitor statistics", () => {
  test("a visit to a public page is counted, and the admin panel is not", async ({
    page,
  }) => {
    await page.goto("/admin/analytics");
    const before = Number(
      (await page.getByText("Page views").locator("..").innerText())
        .replace(/[^\d]/g, "")
        .slice(0, 8) || "0",
    );

    await page.goto("/courses");
    // The beacon fires after hydration, and the count is read back from the
    // database, so give it a moment rather than a fixed sleep.
    await expect(async () => {
      await page.goto("/admin/analytics");
      const after = Number(
        (await page.getByText("Page views").locator("..").innerText())
          .replace(/[^\d]/g, "")
          .slice(0, 8) || "0",
      );
      expect(after).toBeGreaterThan(before);
    }).toPass({ timeout: 30_000 });

    // /courses is listed; nothing from /admin ever is.
    await expect(page.getByText("/courses").first()).toBeVisible();
    await expect(page.getByText("/admin/analytics")).toHaveCount(0);
  });

  test("the collector accepts a beacon and answers with no content", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/hit", {
      data: { path: "/e2e-check", locale: "en" },
    });
    expect(response.status()).toBe(204);
  });
});

test.describe("backups", () => {
  test("a dump can be taken, is listed, and is refused to a signed-out visitor", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/admin/backups");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Backups");

    if (await page.getByText(/pg_dump is not available/).isVisible()) {
      test.skip(true, "No Postgres client on this machine");
    }

    await expect(async () => {
      await page.getByRole("button", { name: "Back up now" }).click();
      await expect(page.getByText("Backup taken.")).toBeVisible({ timeout: 20_000 });
    }).toPass({ timeout: 60_000 });

    const row = page.locator("tr", { hasText: ".dump" }).first();
    await expect(row).toBeVisible();
    const href = await row.getByRole("link", { name: "Download" }).getAttribute("href");
    expect(href).toContain("protected%2Fbackups%2F");

    // The route refuses a key that is not a backup, even to a super admin.
    const bad = await page.request.get(
      "/api/admin/backup?key=" + encodeURIComponent("2026-09/anything.webp"),
    );
    expect(bad.status()).toBe(400);

    // And refuses everything to a browser with no session at all.
    // `newContext` inherits the project's saved admin session unless the
    // state is cleared explicitly, which would quietly make this pass.
    const anonymous = await playwrightRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const signedOut = await anonymous.get(href!);
    expect(signedOut.status()).toBe(401);
    await anonymous.dispose();
  });
});
