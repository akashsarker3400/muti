import { expect, test, type Page } from "@playwright/test";

/**
 * Free health service (addendum 4): publish from Site Settings, request a
 * serial on the public page, see it on the admin desk, mark it seen, record
 * the day's count, and hide the service again.
 */

async function healthTab(page: Page) {
  await page.goto("/admin/settings");
  await page.getByRole("tab", { name: "স্বাস্থ্যসেবা" }).click();
}

async function saveSettings(page: Page) {
  await page.getByRole("button", { name: "সেটিংস সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("free health service", () => {
  test("publishes, takes a serial, and the desk sees it", async ({ page }) => {
    const name = `রোগী টেস্ট ${Date.now().toString(36)}`;

    await healthTab(page);
    await page.locator("#field-health\\.published").check();
    await page.locator("#field-health\\.holiday").uncheck();
    await saveSettings(page);

    try {
      // Public page, nav item and homepage band are now visible.
      await page.goto("/");
      await expect(page.getByTestId("health-band")).toBeVisible();
      await expect(
        page.locator("footer").getByRole("link", { name: "স্বাস্থ্যসেবা" }),
      ).toBeVisible();

      await page.goto("/health-service");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "বিনামূল্যে স্বাস্থ্যসেবা",
      );
      // Addendum 4.1: the commitment leads, the two pillars sit under it.
      await expect(page.getByTestId("health-tagline")).toContainText(
        "অকালমৃত্যু না ঘটে",
      );
      await expect(
        page.getByText("বিনা মূল্যে আল্ট্রাসোনোগ্রাম পরীক্ষা", { exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByText("মানবতার সেবায় MUTI Ultrasound")).toBeVisible();
      // The seeded TODO copy reaches the page rather than leaving sections blank.
      await expect(page.getByTestId("health-schedule")).toContainText("TODO");

      // Serial request: two required fields.
      await page.getByRole("textbox", { name: "পূর্ণ নাম" }).fill(name);
      await page.getByRole("textbox", { name: "মোবাইল নম্বর" }).fill("01778838644");
      await page.getByRole("combobox", { name: "গর্ভবতী?" }).selectOption("YES");
      await page.getByRole("textbox", { name: "গর্ভকাল (মাস)" }).fill("৭");
      await page
        .getByRole("button", { name: "সিরিয়াল নিন", exact: true })
        .last()
        .click();
      const success = page.getByTestId("health-serial-success");
      await expect(success).toBeVisible();
      const serialText = await success.locator(".font-latin").first().textContent();
      expect(serialText?.trim()).toMatch(/^[০-৯]+$/);

      // Admin desk: today's list carries it; mark seen; record the day.
      await page.goto("/admin/health");
      const row = page.locator("tr", { hasText: name });
      await expect(row).toBeVisible();
      await expect(row).toContainText("হ্যাঁ (7 মাস)");
      await row.getByRole("combobox").selectOption("SEEN");
      await expect(row.getByText("দেখা হয়েছে").first()).toBeVisible();

      await page.locator("#count-patients").fill("12");
      await page.locator("#count-reports").fill("11");
      await page.locator("#count-consultations").fill("10");
      await page.getByRole("button", { name: "সংরক্ষণ" }).click();
      await expect(page.getByText("দিনের হিসাব সংরক্ষিত।")).toBeVisible();

      // Printable list renders the serial.
      const print = await page.request.get(`/admin/health/print`);
      expect(print.ok()).toBe(true);
      expect(await print.text()).toContain(name);
    } finally {
      // Hide the service again and clear the test's daily count.
      await healthTab(page);
      await page.locator("#field-health\\.published").uncheck();
      await saveSettings(page);
      await page.goto("/admin/health");
      await page.locator("#count-patients").fill("0");
      await page.locator("#count-reports").fill("0");
      await page.locator("#count-consultations").fill("0");
      await page.getByRole("button", { name: "সংরক্ষণ" }).click();
      await expect(page.getByText("দিনের হিসাব সংরক্ষিত।")).toBeVisible();
    }

    await page.goto("/health-service");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "বিনামূল্যে স্বাস্থ্যসেবা",
    );
  });
});
