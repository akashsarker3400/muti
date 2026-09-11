import { expect, test, type Page } from "@playwright/test";

/**
 * Everything the office can rebrand from the admin: the logo, the brand
 * colours and the six fixed content lists.
 *
 * Each test restores what it changed, so the suite can run repeatedly against
 * a development database.
 */

/**
 * Flips every banner's "active" switch on the list page to `active`. One
 * switch per page load: the list refreshes after each toggle, and clicking
 * a second switch during that refresh was getting lost.
 */
async function setBannersActive(page: Page, active: boolean) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.goto("/admin/banners");
    const switches = page.getByRole("switch", { name: "active" });
    const count = await switches.count();
    let flipped = false;
    for (let i = 0; i < count; i += 1) {
      // nth() is stable across the refresh; a state-based locator would
      // re-resolve to the next unflipped switch after the click.
      const toggle = switches.nth(i);
      if ((await toggle.getAttribute("aria-checked")) === String(active)) continue;
      await toggle.click();
      // The switch flips optimistically and stays disabled until the server
      // action and the refresh finish — leaving earlier would drop the write.
      await expect(toggle).toHaveAttribute("aria-checked", String(active));
      await expect(toggle).toBeEnabled();
      flipped = true;
      break;
    }
    if (!flipped) return;
  }
  throw new Error("banners did not reach the requested state");
}

async function saveSettings(page: Page) {
  await page.getByRole("button", { name: "সেটিংস সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("branding", () => {
  test("hero images set in the admin become an auto-advancing slideshow", async ({
    page,
  }) => {
    const heroTab = async () => {
      await page.goto("/admin/settings");
      await page.getByRole("tab", { name: "হোমপেজ" }).click();
    };
    const pathInput = () => page.locator("#field-homepage\\.heroImages");
    const seconds = () => page.locator("#field-homepage\\.heroSlideSeconds");
    const heroList = () => page.getByTestId("field-homepage.heroImages-list");

    /** Empties the hero list and resets the interval, whatever state it is in. */
    const resetHero = async () => {
      await heroTab();
      // Scoped to the hero list: the other image fields on this tab have a
      // "সরান" button too, and clearing one of those would wipe a real upload.
      const remove = heroList().getByRole("button", { name: "সরান" });
      while ((await remove.count()) > 0) {
        await remove.last().click();
      }
      await seconds().fill("5");
      await saveSettings(page);
    };

    // The static hero (and its slideshow) only renders while no banner is
    // active — addendum 3 puts the full-width slider in front otherwise.
    await setBannersActive(page, false);
    await resetHero();

    try {
      await heroTab();
      await pathInput().fill("/partners/bangladesh-govt-emblem.png");
      await pathInput().press("Enter");
      await pathInput().fill("/logo.svg");
      await pathInput().press("Enter");
      await seconds().fill("1");
      await saveSettings(page);

      await page.goto("/");
      const show = page.getByTestId("hero-slideshow");
      await expect(show).toBeVisible();
      expect(await show.locator("img").count()).toBeGreaterThanOrEqual(2);
      await expect(show.getByRole("tab")).toHaveCount(
        await show.locator("img").count(),
      );
      // It moves on its own…
      await expect(show).toHaveAttribute("data-active", "0");
      await expect(show).not.toHaveAttribute("data-active", "0", { timeout: 3000 });
      // …and the dots let the reader pick a slide directly.
      await show.getByRole("tab").first().click();
      await expect(show).toHaveAttribute("data-active", "0");
    } finally {
      await resetHero();
      await setBannersActive(page, true);
    }
  });

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
      ["certificate-types", 5],
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
