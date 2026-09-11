import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("home page loads with the hero, courses and contact details", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      "আল্ট্রাসাউন্ড",
    );

    // The trust row states the government code (section 5.1).
    await expect(page.getByText("৫৭১২৫").first()).toBeVisible();

    // Every seeded course is linked from the grid (the footer links to them
    // too, so scope the check to the main content).
    await expect(
      page.locator("#main").getByRole("link", { name: "CMU (রেগুলার)", exact: true }),
    ).toBeVisible();

    // WhatsApp CTAs point at the institute number.
    const whatsapp = page.locator('a[href^="https://wa.me/8801778838644"]').first();
    await expect(whatsapp).toHaveAttribute("href", /wa\.me\/8801778838644/);
  });

  test("course page renders the fee table and the routine", async ({ page }) => {
    await page.goto("/courses/cmu-bteb");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("CMU (বিটিইবি)");

    // Fee card: the seeded numbers in Bangla digits, plus the total.
    await expect(page.getByText("৳ ৩০,৭৫০").first()).toBeVisible();
    await expect(page.getByText("সর্বমোট")).toBeVisible();
    await expect(page.getByText("৳ ৩৭,১৫০").first()).toBeVisible();

    // Payment policy and the routine table.
    await expect(page.getByText("ভর্তির সময় কোর্স ফি'র ৫০%")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Basic Physics of Ultrasound" }),
    ).toBeVisible();
  });

  test("a course with no fee shows the contact line instead of a table", async ({
    page,
  }) => {
    await page.goto("/courses/color-doppler");
    await expect(page.getByText("ফি জানতে যোগাযোগ করুন").first()).toBeVisible();
  });

  test("the language switch keeps the visitor on the same page", async ({ page }) => {
    await page.goto("/courses");

    // On phones the switch lives inside the hamburger sheet.
    const menuButton = page.getByRole("button", { name: "মেনু খুলুন" });
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }

    await page.getByRole("group", { name: "ভাষা" }).getByText("English").click();

    await expect(page).toHaveURL(/\/en\/courses$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Courses");
  });

  test("certificate verification reports an unknown number", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("textbox").fill("MUTI-0000-0000");
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    await expect(
      page.getByText("কোনো রেকর্ড পাওয়া যায়নি, অফিসে যোগাযোগ করুন।"),
    ).toBeVisible();
  });

  test("the admission form rejects an invalid phone number", async ({ page }) => {
    await page.goto("/apply");
    await page.getByRole("textbox", { name: "পূর্ণ নাম" }).fill("ডা. পরীক্ষা");
    await page.getByRole("textbox", { name: "মোবাইল নম্বর" }).fill("12345");
    await page.getByRole("combobox", { name: /^কোর্স/ }).selectOption({ index: 1 });
    await page.getByRole("combobox", { name: /শিক্ষাগত যোগ্যতা/ }).selectOption("MBBS");
    await page.getByRole("checkbox", { name: /আমি সম্মত/ }).check();
    await page.getByRole("button", { name: /আবেদন জমা দিন/ }).click();

    await expect(page.getByText(/সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন/)).toBeVisible();
  });

  test("the admission form submits and offers the WhatsApp follow-up", async ({
    page,
  }) => {
    await page.goto("/apply");
    const name = `ডা. স্মোক ${Date.now().toString(36)}`;

    await page.getByRole("textbox", { name: "পূর্ণ নাম" }).fill(name);
    await page.getByRole("textbox", { name: "মোবাইল নম্বর" }).fill("01778838644");
    await page.getByRole("combobox", { name: /^কোর্স/ }).selectOption({ index: 1 });
    await page.getByRole("combobox", { name: /শিক্ষাগত যোগ্যতা/ }).selectOption("MBBS");
    await page.getByRole("checkbox", { name: /আমি সম্মত/ }).check();
    await page.getByRole("button", { name: /আবেদন জমা দিন/ }).click();

    await expect(page.getByText("আপনার আবেদন জমা হয়েছে")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /WhatsApp-এ মেসেজ করুন/ }),
    ).toBeVisible();
  });

  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/courses/dmu");

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /admin");
  });
});
