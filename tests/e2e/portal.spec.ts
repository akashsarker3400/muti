import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";

/**
 * The student portal (addendum 2, B12) and the JSON mirror section C asks for.
 *
 * Signing in needs the code that was sent by SMS. No gateway is configured in
 * the test environment, so the code is read from the outbox — which is itself
 * worth pinning: the message must be recorded whether or not it was sent.
 */

const stamp = () => Date.now().toString(36);

async function saveAndLeave(page: Page, list: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(list, { timeout: 4000 });
  }).toPass({ timeout: 40_000 });
}

// The portal is not the admin, so these run signed out of the panel.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("student portal", () => {
  test("a student signs in with a code and sees only their own record", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    const id = stamp();
    const name = `Dr. Portal ${id}`;
    // A number nobody else in the test data uses.
    const phone = `017${String(Date.now()).slice(-8)}`;

    // The office creates the student, in its own signed-in context.
    const adminContext = await browser.newContext({
      storageState: "tests/e2e/.auth/admin.json",
    });
    const admin = await adminContext.newPage();
    await admin.goto("/admin/students/new");
    await admin.locator("#field-name").fill(name);
    await admin.locator("#field-roll").fill(`PT-${id}`);
    await admin.locator("#field-phone").fill(phone);
    await admin.locator("#field-courseId").selectOption({ index: 1 });
    await saveAndLeave(admin, /\/admin\/students$/);

    try {
      // The student asks for a code.
      await page.goto("/portal");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("পোর্টাল");
      await page.getByLabel("মোবাইল নম্বর").fill(phone);
      await page.getByRole("button", { name: "কোড পাঠান" }).click();
      await expect(page.getByLabel("ছয় অঙ্কের কোড")).toBeVisible();

      // The code is in the outbox even though no gateway is configured.
      await admin.goto("/admin/messages");
      const row = admin.locator("tr", { hasText: "portal-otp" }).first();
      await expect(row).toBeVisible();
      // Anchored on the word before it: the row also shows the phone number,
      // whose last six digits would otherwise match first.
      const body = await row.innerText();
      const code = body.match(/কোড\s*(\d{6})/)?.[1];
      expect(code, "the outbox holds the code that was sent").toBeTruthy();

      // Signing in with the wrong code is refused.
      await page.getByLabel("ছয় অঙ্কের কোড").fill("000000");
      await page.getByRole("button", { name: "ঢুকুন" }).click();
      await expect(page.locator("[data-sonner-toast]")).toBeVisible();

      // And with the right one, the student's own record opens.
      await page.getByLabel("ছয় অঙ্কের কোড").fill(code!);
      await page.getByRole("button", { name: "ঢুকুন" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
      await expect(page.getByRole("heading", { name: "উপস্থিতি" })).toBeVisible();

      // The tabs are their own data, and nothing else.
      await page.goto("/portal/fees");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("ফি");
      await page.goto("/portal/results");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("ফলাফল");

      // The JSON mirror answers the same question for a mobile app.
      const api = await page.request.get("/api/v1/portal?what=overview");
      expect(api.status()).toBe(200);
      const payload = await api.json();
      expect(payload.data.student.name).toBe(name);

      // Signed out, it refuses.
      const anonymous = await playwrightRequest.newContext({
        baseURL: "http://localhost:3000",
        storageState: { cookies: [], origins: [] },
      });
      const refused = await anonymous.get("/api/v1/portal?what=fees");
      expect(refused.status()).toBe(401);
      await anonymous.dispose();
    } finally {
      await admin.goto(`/admin/students?q=${encodeURIComponent(name)}`);
      const studentRow = admin.locator("tr", { hasText: name });
      if (await studentRow.count()) {
        await studentRow.getByRole("button", { name: "Delete" }).click();
        await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await admin.waitForTimeout(400);
      }
      await adminContext.close();
    }
  });
});
