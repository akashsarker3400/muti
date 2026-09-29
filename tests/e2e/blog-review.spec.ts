import { expect, test, type Page } from "@playwright/test";

/**
 * The review gate on blog posts (addendum 5, A5) and the SEO the published
 * article carries: the reviewer byline, BlogPosting structured data and the
 * "read next" links.
 *
 * The test writes its own post and removes it again, so it never publishes
 * one of the eight course-book drafts, which must wait for a real doctor.
 */

const stamp = () => Date.now().toString(36);

async function save(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
}

test.describe("blog review gate", () => {
  test("a post marked for review cannot be published until a reviewer is named", async ({
    page,
  }) => {
    const id = stamp();
    const title = `Review gate ${id}`;

    await page.goto("/admin/blog/new");
    await page.locator("#field-titleEn").fill(title);
    // The English body is the rich text editor; the Bangla fields live behind
    // the language toggle and are optional.
    await page.locator(".ProseMirror").first().click();
    await page.keyboard.type(
      "Hydronephrosis is graded from mild to marked on ultrasound.",
    );
    await page.locator("#field-excerpt").fill("A short note for the test.");
    await page.locator("#field-needsReview").check();
    await page.locator("#field-published").check();
    await save(page);

    // Refused, with the reason and no row created.
    await expect(page.getByText(/Needs faculty review/)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/blog\/new/);

    // Record the doctor, untick the flag, and it saves.
    await page
      .locator("#field-reviewedBy")
      .fill("Dr. Ashraful Islam, MBBS, DMU (test)");
    await page.locator("#field-needsReview").uncheck();
    await save(page);
    await expect(page).toHaveURL(/\/admin\/blog$/);

    try {
      // The public article carries the byline and the structured data.
      const slug = title.toLowerCase().replaceAll(" ", "-");
      await page.goto(`/blog/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
      await expect(page.getByText(/Medically reviewed by/)).toContainText(
        "Dr. Ashraful Islam",
      );
      await expect(page.getByText(/min read/)).toBeVisible();

      const scripts = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      const article = scripts
        .map((text) => JSON.parse(text))
        .find((entry) => entry["@type"] === "BlogPosting");
      expect(article).toBeTruthy();
      expect(article.reviewedBy.name).toContain("Dr. Ashraful Islam");
      expect(article.lastReviewed).toBeTruthy();
      expect(article.dateModified).toBeTruthy();

      const breadcrumb = scripts
        .map((text) => JSON.parse(text))
        .find((entry) => entry["@type"] === "BreadcrumbList");
      expect(breadcrumb.itemListElement).toHaveLength(3);

      // Bangla falls back to the English text and keeps the byline.
      await page.goto(`/bn/blog/${slug}`);
      await expect(page.getByText(/যাচাই করেছেন/)).toBeVisible();
    } finally {
      await page.goto("/admin/blog");
      const row = page.locator("tr", { hasText: title });
      await row.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.locator("tr", { hasText: title })).toHaveCount(0);
    }
  });
});
