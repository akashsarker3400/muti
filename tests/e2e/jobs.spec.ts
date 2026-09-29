import { expect, test, type Page } from "@playwright/test";

/**
 * The job board (addendum 2, B11) and the owner's reports (B8).
 */

const stamp = () => Date.now().toString(36);

async function saveAndLeave(page: Page, list: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(list, { timeout: 4000 });
  }).toPass({ timeout: 40_000 });
}

test.describe("job board", () => {
  test("a published job appears, and one past its deadline does not", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const id = stamp();
    const open = `Sonographer wanted ${id}`;
    const closed = `Closed post ${id}`;

    for (const [title, deadline, published] of [
      [open, "", true],
      [closed, "2020-01-01", true],
    ] as const) {
      await page.goto("/admin/jobs/new");
      await page.locator("#field-title").fill(title);
      await page.locator("#field-organization").fill("Radiant Hospital");
      await page.locator("#field-location").fill("Mymensingh");
      await page.locator("#field-contact").fill("Call 01778-838644");
      await page.locator(".ProseMirror").first().click();
      await page.keyboard.type("Full time sonographer for the evening shift.");
      if (deadline) await page.locator("#field-deadline").fill(deadline);
      if (published) await page.locator("#field-published").check();
      await saveAndLeave(page, /\/admin\/jobs$/);
    }

    try {
      await page.goto("/jobs");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Jobs");
      await expect(page.getByText(open)).toBeVisible();
      // A job whose deadline has passed is not listed: applying for a post
      // that closed years ago wastes everybody's time.
      await expect(page.getByText(closed)).toHaveCount(0);

      await page.getByText(open).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(open);
      await expect(page.getByText("How to apply")).toBeVisible();
      await expect(page.getByText("Call 01778-838644")).toBeVisible();

      // Bangla falls back to the English description.
      await page.goto("/bn/jobs");
      await expect(page.getByText(open)).toBeVisible();
    } finally {
      for (const title of [open, closed]) {
        await page.goto(`/admin/jobs?q=${encodeURIComponent(title)}`);
        const row = page.locator("tr", { hasText: title });
        if (await row.count()) {
          await row.getByRole("button", { name: "Delete" }).click();
          await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
          await page.waitForTimeout(400);
        }
      }
    }
  });
});

test.describe("reports", () => {
  test("the owner's page answers the six questions", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Reports");
    await expect(page.getByText("Collected this month")).toBeVisible();
    await expect(page.getByText("Collection rate")).toBeVisible();
    await expect(page.getByText("Where enquiries come from")).toBeVisible();
    // "Batches" is also the sidebar link, so the panel's own heading is used.
    await expect(page.getByRole("heading", { name: "Batches" })).toBeVisible();
    await expect(page.getByText("Collected per month")).toBeVisible();
  });
});
