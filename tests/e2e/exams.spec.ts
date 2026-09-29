import { expect, test, type Page } from "@playwright/test";

/**
 * Examinations and marks (addendum 2, B3): the grade follows the mark, a
 * blank means the student did not sit, and publishing tells the batch.
 */

const stamp = () => Date.now().toString(36);

async function saveAndLeave(page: Page, list: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(list, { timeout: 4000 });
  }).toPass({ timeout: 40_000 });
}

test.describe("examinations", () => {
  test("marks are graded as they are typed, and publishing tells the batch", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const id = stamp();
    const batchName = `Exam Batch ${id}`;
    const topper = `Dr. Topper ${id}`;
    const absentee = `Dr. Absentee ${id}`;

    await page.goto("/admin/batches/new");
    await page.locator("#field-name").fill(batchName);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await saveAndLeave(page, /\/admin\/batches$/);

    for (const [index, name] of [topper, absentee].entries()) {
      await page.goto("/admin/students/new");
      await page.locator("#field-name").fill(name);
      await page.locator("#field-roll").fill(`EX-${id}-${index}`);
      await page.locator("#field-courseId").selectOption({ index: 1 });
      await page.locator("#field-batchId").selectOption({ label: batchName });
      await saveAndLeave(page, /\/admin\/students$/);
    }

    try {
      // Followed by href rather than clicked: the row carries several links
      // and a click that lands before hydration simply does nothing.
      await page.goto(`/admin/batches?q=${encodeURIComponent(batchName)}`);
      const examsHref = await page
        .locator("tr", { hasText: batchName })
        .getByRole("link", { name: "Exams" })
        .getAttribute("href");
      await page.goto(examsHref!);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(batchName);

      // Add the examination.
      await expect(async () => {
        await page.getByRole("button", { name: "Add an examination" }).click();
        await expect(page.getByLabel("Examination")).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 40_000 });
      await page.getByLabel("Examination").fill("First semester final");
      await page.getByRole("button", { name: "Add examination" }).click();
      await expect(page.getByText("First semester final")).toBeVisible();

      // Enter marks: one scores, one did not sit.
      const marksHref = await page
        .getByRole("link", { name: "Marks" })
        .getAttribute("href");
      await page.goto(marksHref!);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "First semester final",
      );

      await page.getByLabel(`Marks for ${topper}`).fill("82");
      // The grade appears as the mark is typed, and is never typed itself.
      await expect(page.getByText("A+")).toBeVisible();
      // The phrase is in the summary line too, so the row's own cell is used.
      const absentRow = page.locator("tr", { hasText: absentee });
      await expect(absentRow.getByText("did not sit")).toBeVisible();
      await expect(page.getByText("1 sat")).toBeVisible();

      // A failing mark is shown as failing.
      await page.getByLabel(`Marks for ${absentee}`).fill("12");
      await expect(page.getByText("F").first()).toBeVisible();
      // Clearing it again means "did not sit", not zero.
      await page.getByLabel(`Marks for ${absentee}`).fill("");
      await expect(absentRow.getByText("did not sit")).toBeVisible();

      await page.getByRole("button", { name: "Save marks" }).click();
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "Marks saved" }),
      ).toBeVisible();

      // Publishing is a commitment, so it asks first.
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Publish result" }).click();
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "Published" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

      // The mark survived the round trip.
      await page.reload();
      await expect(page.getByLabel(`Marks for ${topper}`)).toHaveValue("82");
    } finally {
      for (const name of [topper, absentee]) {
        await page.goto(`/admin/students?q=${encodeURIComponent(name)}`);
        const row = page.locator("tr", { hasText: name });
        if (await row.count()) {
          await row.getByRole("button", { name: "Delete" }).click();
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Delete" })
            .click();
          await page.waitForTimeout(400);
        }
      }
      await page.goto(`/admin/batches?q=${encodeURIComponent(batchName)}`);
      const batchRow = page.locator("tr", { hasText: batchName });
      if (await batchRow.count()) {
        await batchRow.getByRole("button", { name: "Delete" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await page.waitForTimeout(400);
      }
    }
  });
});
