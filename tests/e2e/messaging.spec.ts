import { expect, test } from "@playwright/test";

/**
 * SMS and WhatsApp (addendum 2, A4): the templates, the outbox, and the fact
 * that a message the gateway refused is still recorded rather than lost.
 *
 * The tests do not assume a gateway is configured. On a machine without one
 * every message is logged as "not sent" with the reason, which is exactly the
 * behaviour worth pinning: nothing disappears silently.
 */

test.describe("messaging", () => {
  test("the built-in templates are listed and can be restored", async ({ page }) => {
    await page.goto("/admin/message-templates");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Message templates",
    );

    for (const key of [
      "application-received",
      "application-admitted",
      "class-starting",
      "appointment-confirmed",
      "appointment-reminder",
      "certificate-ready",
    ]) {
      await expect(page.locator("tr", { hasText: key })).toHaveCount(1);
    }

    // Restoring is idempotent: it only ever adds what is missing, so a second
    // press on a seeded database adds nothing.
    await page.goto("/admin/messages");
    const toast = page.locator("[data-sonner-toast]");
    await expect(async () => {
      await page.getByRole("button", { name: /Restore built-in templates/ }).click();
      await expect(toast).toContainText(/already there|added/, { timeout: 2000 });
    }).toPass({ timeout: 30_000 });
  });

  test("a message typed by hand is recorded in the outbox either way", async ({
    page,
  }) => {
    const body = `Test ${Date.now().toString(36)}`;

    await page.goto("/admin/messages");
    await expect(async () => {
      await page.getByRole("button", { name: "Send a message" }).click();
      await expect(page.getByLabel("Mobile number")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 30_000 });

    await page.getByLabel("Mobile number").fill("01778838644");
    await page.getByLabel("Message").fill(body);

    // The part counter is what stops a friendly message costing three SMS.
    await expect(page.getByText(/1 SMS/)).toBeVisible();

    await page.getByRole("button", { name: "Send", exact: true }).click();

    // Sent or refused, the outbox has it, with the number in local form.
    const row = page.locator("tr", { hasText: body });
    await expect(row).toBeVisible();
    await expect(row).toContainText("01778-838644");
  });

  test("an invalid number is refused before anything is sent", async ({ page }) => {
    await page.goto("/admin/messages");
    await expect(async () => {
      await page.getByRole("button", { name: "Send a message" }).click();
      await expect(page.getByLabel("Mobile number")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 30_000 });

    await page.getByLabel("Mobile number").fill("12345");
    await page.getByLabel("Message").fill("nope");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText(/valid Bangladeshi mobile number/)).toBeVisible();
  });

  test("the reminder endpoint refuses a request without the cron secret", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/messages", {
      headers: { authorization: "Bearer definitely-not-the-secret" },
    });
    // 401 when a secret is set, 503 when the server has none configured.
    expect([401, 503]).toContain(response.status());
  });
});
