import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mymensinghultrasound@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "লগইন" }).click();
  await page.waitForURL(/\/admin(?!\/login)/);
}

test.describe("admin panel", () => {
  test("the panel is closed to visitors who are not signed in", async ({ page }) => {
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "MUTI অ্যাডমিন প্যানেল",
    );
  });

  test("a wrong password is rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "লগইন" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("সঠিক নয়");
  });

  test("signing in lands on the dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("স্বাগতম");
    await expect(page.getByText("নতুন আবেদন (৭ দিন)")).toBeVisible();
  });

  test("a notice created in the admin appears on the public notice board", async ({
    page,
  }) => {
    await login(page);

    const stamp = Date.now().toString(36);
    const title = `স্মোক টেস্ট নোটিশ ${stamp}`;

    await page.goto("/admin/notices/new");
    await page.locator("#field-titleBn").fill(title);
    await page.locator(".ProseMirror").first().click();
    await page.keyboard.type("স্মোক টেস্টের জন্য তৈরি নোটিশ।");
    await page.locator("#field-category").selectOption("ADMISSION");
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();

    await page.waitForURL(/\/admin\/notices$/);
    await expect(page.getByRole("cell", { name: title })).toBeVisible();

    await page.goto("/notices");
    await expect(page.getByText(title)).toBeVisible();

    // Clean up so repeated runs stay independent.
    await page.goto("/admin/notices");
    const row = page.locator("tr", { hasText: title });
    await row.getByRole("button", { name: "মুছে ফেলুন" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "মুছে ফেলুন" }).click();
    await expect(page.getByRole("cell", { name: title })).toBeHidden();
  });

  test("site settings reach the public site", async ({ page }) => {
    await login(page);
    await page.goto("/admin/settings");

    const stamp = Date.now().toString(36);
    await page.getByRole("tab", { name: "যোগাযোগ" }).click();
    await page.locator("#field-contact\\.officeHoursBn").fill(`অফিস সময় ${stamp}`);
    await page.getByRole("button", { name: "সেটিংস সংরক্ষণ করুন" }).click();
    await page.waitForURL(/\/admin$/);

    await page.goto("/contact");
    await expect(page.getByText(`অফিস সময় ${stamp}`)).toBeVisible();
  });
});
