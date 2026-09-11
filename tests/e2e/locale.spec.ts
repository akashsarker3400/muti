import { expect, test } from "@playwright/test";

/**
 * Locale change: English is the default at the root, Bangla lives under /bn,
 * old /en URLs redirect for good, and the admin requires English but not
 * Bangla.
 */

test.describe("locales", () => {
  test("the root is English, /bn is Bangla, and Bangla falls back to English", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      "ultrasound training institute",
    );
    // Latin digits and Inter on the English site.
    await expect(page.getByText("57125").first()).toBeVisible();
    const englishFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(englishFont).toContain("Inter");
    expect(englishFont).not.toContain("Noto Sans Bengali");

    // Visiting /bn is an explicit choice: it is remembered in the cookie.
    await page.goto("/bn");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      "আল্ট্রাসাউন্ড",
    );
    await expect(page.getByText("৫৭১২৫").first()).toBeVisible();
    const banglaFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(banglaFont).toContain("Noto Sans Bengali");
    await page.goto("/");
    await expect(page).toHaveURL(/\/bn$/);
  });

  test("old /en URLs redirect permanently to the root", async ({ request }) => {
    const urls = [
      "/en",
      "/en/courses",
      "/en/courses/dmu",
      "/en/admission",
      "/en/apply",
      "/en/verify",
      "/en/results",
      "/en/notices",
      "/en/contact",
      "/en/health-service?x=1",
    ];
    for (const url of urls) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status(), url).toBe(308);
      const location = response.headers()["location"];
      expect(location, url).toBe(url.replace(/^\/en(?=\/|$)/, "") || "/");
    }
  });

  test("the switcher keeps the path in both directions", async ({ page }) => {
    await page.goto("/courses");
    const menuButton = page.getByRole("button", { name: "Open menu" });
    if (await menuButton.isVisible()) await menuButton.click();
    await page
      .getByRole("group", { name: "Language" })
      .locator('button[lang="bn"]')
      .click();
    await expect(page).toHaveURL(/\/bn\/courses$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("কোর্সসমূহ");

    const bnMenu = page.getByRole("button", { name: "মেনু খুলুন" });
    if (await bnMenu.isVisible()) await bnMenu.click();
    await page
      .getByRole("group", { name: "ভাষা" })
      .locator('button[lang="en"]')
      .click();
    await expect(page).toHaveURL(/\/courses$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Courses");
  });

  test("a Bangla browser lands on /bn on its first visit only", async ({ browser }) => {
    const context = await browser.newContext({ locale: "bn-BD" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/bn$/);

    // Choosing English in the switcher is remembered in the cookie, so the
    // browser language is not consulted again.
    const menuButton = page.getByRole("button", { name: "মেনু খুলুন" });
    if (await menuButton.isVisible()) await menuButton.click();
    await page
      .getByRole("group", { name: "ভাষা" })
      .locator('button[lang="en"]')
      .click();
    await expect(page).toHaveURL(/\/$/);
    const cookie = (await context.cookies()).find((c) => c.name === "NEXT_LOCALE");
    expect(cookie?.value).toBe("en");
    await page.goto("/courses");
    await expect(page).toHaveURL(/\/courses$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await context.close();
  });

  test("hreflang, canonical and sitemap use en at the root and bn under /bn", async ({
    page,
    request,
  }) => {
    await page.goto("/courses/dmu");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/courses\/dmu$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="bn"]')).toHaveAttribute(
      "href",
      /\/bn\/courses\/dmu$/,
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", /\/courses\/dmu$/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain('hreflang="x-default"');
    expect(sitemap).not.toContain("/en/");
  });
});

test.describe("admin: English required, Bangla optional", () => {
  test("a course saves without Bangla and refuses to save without English", async ({
    page,
  }) => {
    const id = Date.now().toString(36);
    const code = `LOC-${id}`.toUpperCase();

    await page.goto("/admin/courses/new");
    await page.locator("#field-code").fill(code);
    await page.getByRole("tab", { name: "Fees" }).click();
    await page.locator("#field-courseFee").fill("1000");
    await page.getByRole("button", { name: "Save" }).click();

    // Names the English fields it needs, in English, and opens their tab.
    await expect(page.getByText("Some fields need attention.")).toBeVisible();
    await expect(
      page.getByText("Short name (English): Name (English) is required"),
    ).toBeVisible();
    await expect(
      page.getByText("Full name (English): Full name (English) is required"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/courses\/new$/);
    await expect(page.getByRole("tab", { name: "Basics" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.locator("#field-nameEn").fill(`Locale ${id}`);
    await page.locator("#field-fullNameEn").fill(`Locale Course ${id}`);
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/courses$/);
    await expect(page.getByText(`Locale ${id}`)).toBeVisible();

    // Clean up.
    const row = page.locator("li", { hasText: `Locale ${id}` }).first();
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(`Locale ${id}`)).toHaveCount(0);
  });

  test("the Needs English list flags English fields that still hold Bangla", async ({
    page,
  }) => {
    const id = Date.now().toString(36);
    const title = `প্লেসহোল্ডার ${id}`;

    await page.goto("/admin/notices/new");
    await page.locator("#field-titleEn").fill(title);
    await page.locator(".ProseMirror").first().click();
    await page.keyboard.type("Body in English.");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/notices$/);

    await page.goto("/admin/needs-english");
    const row = page.locator("tr", { hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText("titleEn");

    await page.goto("/admin/notices");
    const notice = page.locator("tr", { hasText: title });
    await notice.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr", { hasText: title })).toHaveCount(0);

    await page.goto("/admin/needs-english");
    await expect(page.locator("tr", { hasText: title })).toHaveCount(0);
  });
});
