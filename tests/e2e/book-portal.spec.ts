import { expect, test, type Page } from "@playwright/test";

/**
 * The course book and question bank inside the portal (addendum 5, B1–B2).
 *
 * The rule the whole feature rests on: nothing reaches a student until a
 * doctor has approved it. The test pins that in both directions.
 */

const stamp = () => Date.now().toString(36);

// The portal is not the admin panel, so these run signed out of it.
test.use({ storageState: { cookies: [], origins: [] } });

async function openChapterEditor(admin: Page) {
  await admin.goto("/admin/course-book");
  const href = await admin
    .getByRole("link", { name: /Write chapter/ })
    .first()
    .getAttribute("href");
  await admin.goto(href!);
  return href!.split("/").pop()!;
}

test.describe("course book in the portal", () => {
  test("an unreviewed chapter stays hidden, and an approved one is readable", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const id = stamp();
    const name = `Dr. Reader ${id}`;
    const phone = `018${String(Date.now()).slice(-8)}`;
    const marker = `Chapter text for the test ${id}`;

    const adminContext = await browser.newContext({
      storageState: "tests/e2e/.auth/admin.json",
    });
    const admin = await adminContext.newPage();

    // The office writes a chapter. Saving always clears any earlier review,
    // which is also what makes this test repeatable: whatever state the
    // chapter was left in, it is unreviewed again from here.
    const chapterId = await openChapterEditor(admin);
    await admin.locator(".ProseMirror").first().click();
    await admin.keyboard.press("ControlOrMeta+a");
    await admin.keyboard.type(marker);
    await expect(async () => {
      await admin.getByRole("button", { name: "Save chapter" }).click();
      await expect(
        admin.locator("[data-sonner-toast]").filter({ hasText: "Saved" }),
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 40_000 });
    await admin.reload();
    await expect(admin.getByText("Not reviewed").first()).toBeVisible();

    // A student of that course.
    await admin.goto("/admin/students/new");
    await admin.locator("#field-name").fill(name);
    await admin.locator("#field-roll").fill(`RD-${id}`);
    await admin.locator("#field-phone").fill(phone);
    const cmu = await admin
      .locator("#field-courseId option", { hasText: "CMU" })
      .first()
      .getAttribute("value");
    await admin.locator("#field-courseId").selectOption(cmu!);
    await expect(async () => {
      await admin.getByRole("button", { name: "Save" }).click();
      await expect(admin).toHaveURL(/\/admin\/students$/, { timeout: 4000 });
    }).toPass({ timeout: 40_000 });

    try {
      // The student signs in.
      await page.goto("/portal");
      await page.getByLabel("মোবাইল নম্বর").fill(phone);
      await page.getByRole("button", { name: "কোড পাঠান" }).click();
      await expect(page.getByLabel("ছয় অঙ্কের কোড")).toBeVisible();

      await admin.goto("/admin/messages");
      const otpRow = admin.locator("tr", { hasText: "portal-otp" }).first();
      const code = (await otpRow.innerText()).match(/কোড\s*(\d{6})/)?.[1];
      expect(code).toBeTruthy();

      await page.getByLabel("ছয় অঙ্কের কোড").fill(code!);
      await page.getByRole("button", { name: "ঢুকুন" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(name);

      // The chapter is written but not reviewed, so it is not readable.
      await page.goto("/portal/book");
      await expect(page.getByText("এখনো যোগ করা হয়নি").first()).toBeVisible();
      const blocked = await page.goto(`/portal/book/${chapterId}`);
      expect(blocked?.status()).toBe(404);

      // A doctor approves it.
      admin.once("dialog", (dialog) => dialog.accept("Dr. Test Reviewer, MBBS"));
      await admin.goto(`/admin/course-book/chapters/${chapterId}`);
      await expect(async () => {
        await admin.getByRole("button", { name: "Record the review" }).click();
        // The word is in the explanatory panel too, so the badge is targeted.
        await expect(
          admin.locator("[data-sonner-toast]").filter({ hasText: "Students can read" }),
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 40_000 });

      // Now the student can read it, and the text carries their roll.
      await page.goto(`/portal/book/${chapterId}`);
      await expect(page.getByText(marker)).toBeVisible();
      await expect(page.getByText(`RD-${id}`).first()).toBeVisible();

      await page.getByRole("button", { name: "পড়া হয়েছে" }).click();
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "পড়া হয়েছে" }),
      ).toBeVisible();
    } finally {
      await admin.goto(`/admin/students?q=${encodeURIComponent(name)}`);
      const row = admin.locator("tr", { hasText: name });
      if (await row.count()) {
        await row.getByRole("button", { name: "Delete" }).click();
        await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await admin.waitForTimeout(400);
      }
      await adminContext.close();
    }
  });
});
