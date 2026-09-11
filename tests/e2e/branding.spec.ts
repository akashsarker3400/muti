import { expect, test, type Page } from "@playwright/test";

/**
 * Everything the office can rebrand from the admin: the logo, the brand
 * colours and the six fixed content lists.
 *
 * Each test restores what it changed, so the suite can run repeatedly against
 * a development database.
 */

async function saveSettings(page: Page) {
  await page.getByRole("button", { name: "সেটিংস সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("branding", () => {
  test("a brand colour set in the admin reaches the public site", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "ব্র্যান্ডিং" }).click();
    await page.locator("#field-branding\\.brandColor").fill("#0E7C6B");
    await saveSettings(page);

    await page.goto("/");
    const brand = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--brand").trim(),
    );
    expect(brand.toLowerCase()).toBe("#0e7c6b");

    // Restore the seeded navy.
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "ব্র্যান্ডিং" }).click();
    await page.locator("#field-branding\\.brandColor").fill("");
    await saveSettings(page);

    await page.goto("/");
    const restored = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--brand").trim(),
    );
    expect(restored.toLowerCase()).toBe("#1b2a6b");
  });

  test("a colour that is not a hex value is ignored, not injected", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "ব্র্যান্ডিং" }).click();
    await page.locator("#field-branding\\.brandColor").fill("red; content: 'x'");
    await saveSettings(page);

    await page.goto("/");
    const brand = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--brand").trim(),
    );
    // Falls back to the built-in palette rather than writing the value into CSS.
    expect(brand.toLowerCase()).toBe("#1b2a6b");

    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "ব্র্যান্ডিং" }).click();
    await page.locator("#field-branding\\.brandColor").fill("");
    await saveSettings(page);
  });
});

test.describe("editable content lists", () => {
  test("each editor shows only its own list", async ({ page }) => {
    const counts: Array<[string, number]> = [
      ["why-choose", 10],
      ["documents", 6],
      ["payment-policy", 3],
      ["admission-steps", 4],
      ["values", 3],
      ["certificates", 5],
    ];

    for (const [key, expected] of counts) {
      await page.goto(`/admin/${key}`);
      await expect(page.locator("tbody tr")).toHaveCount(expected);
    }
  });

  test("editing a payment policy line updates every course fee card", async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const text = `পরীক্ষামূলক নিয়ম ${stamp}`;

    await page.goto("/admin/payment-policy");
    await page.getByRole("link", { name: "সম্পাদনা" }).first().click();
    await page.waitForURL(/\/admin\/payment-policy\/[^/]+$/);

    const original = await page.locator("#field-bodyBn").inputValue();
    await page.locator("#field-bodyBn").fill(text);
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await page.waitForURL(/\/admin\/payment-policy$/);

    // The same list feeds the course fee card and the admission page.
    await page.goto("/courses/dmu");
    await expect(page.getByText(text)).toBeVisible();
    await page.goto("/admission");
    await expect(page.getByText(text)).toBeVisible();

    // Put the seeded wording back.
    await page.goto("/admin/payment-policy");
    await page.getByRole("link", { name: "সম্পাদনা" }).first().click();
    await page.waitForURL(/\/admin\/payment-policy\/[^/]+$/);
    await page.locator("#field-bodyBn").fill(original);
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await page.waitForURL(/\/admin\/payment-policy$/);
  });

  test("unpublishing a document hides it from course pages", async ({ page }) => {
    await page.goto("/courses/dmu");
    const before = await page.getByText("SSC পাশের সনদ").count();
    expect(before).toBeGreaterThan(0);

    await page.goto("/admin/documents");
    const row = page.locator("tr", { hasText: "SSC পাশের সনদ" });
    await row.getByRole("switch").click();
    await page.waitForTimeout(1200);

    await page.goto("/courses/dmu");
    await expect(page.getByText("SSC পাশের সনদ")).toHaveCount(0);

    // Publish it again.
    await page.goto("/admin/documents");
    await page.locator("tr", { hasText: "SSC পাশের সনদ" }).getByRole("switch").click();
    await page.waitForTimeout(1200);

    await page.goto("/courses/dmu");
    await expect(page.getByText("SSC পাশের সনদ")).toBeVisible();
  });
});
