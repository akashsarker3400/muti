import { expect, test, type Page } from "@playwright/test";

/**
 * Live seat counter and waitlist (addendum 2, A1).
 *
 * The test drives the admin panel to put a batch into each state, so it
 * exercises the real write path (including the 60-second cache being dropped
 * on save) rather than seeding the database behind the app's back.
 */

/** Sets the seat numbers on the CMU-BTEB batch and returns to the list. */
async function setSeats(page: Page, seats: string, filled: string) {
  await page.goto("/admin/batches");
  await page
    .locator("tr", { hasText: "CMU-BTEB Batch" })
    .getByRole("link", { name: "Edit" })
    .click();
  await page.waitForURL(/\/admin\/batches\/[^/]+$/);
  await page.locator("#field-seats").fill(seats);
  await page.locator("#field-seatsFilled").fill(filled);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/admin\/batches$/);
}

/** The badge in the course page header, not the related-courses grid. */
function headerBadge(page: Page) {
  return page
    .locator("main > div")
    .first()
    .getByText(/সিট বাকি|সিট পূর্ণ/)
    .first();
}

test.describe("live seat counter", () => {
  test("shows seats left, warns when few remain, and offers a waitlist when full", async ({
    page,
  }) => {
    // --- plenty of seats ---
    await setSeats(page, "20", "6");
    await page.goto("/bn/courses/cmu-bteb");
    await expect(headerBadge(page)).toHaveText("সিট বাকি ১৪টি");
    await expect(
      page.locator("main > div").first().getByRole("link", { name: "এখনই আবেদন করুন" }),
    ).toBeVisible();

    // --- five or fewer: urgent ---
    await setSeats(page, "20", "17");
    await page.goto("/bn/courses/cmu-bteb");
    await expect(headerBadge(page)).toContainText("সিট বাকি ৩টি");
    await expect(headerBadge(page)).toContainText("দ্রুত ভর্তি হোন");

    // --- full: waitlist ---
    await setSeats(page, "20", "20");
    await page.goto("/bn/courses/cmu-bteb");
    await expect(headerBadge(page)).toHaveText("সিট পূর্ণ");
    await expect(
      page.getByText("সিট পূর্ণ, পরবর্তী ব্যাচের জন্য যোগাযোগ করুন"),
    ).toBeVisible();

    const apply = page
      .locator("main > div")
      .first()
      .getByRole("link", { name: "ওয়েটলিস্টে যোগ দিন" });
    await expect(apply).toBeVisible();
    await expect(apply).toHaveAttribute("href", /waitlist=1/);

    // --- the waitlist form explains itself and renames its button ---
    await apply.click();
    await expect(page.getByText(/এই ব্যাচের সিট পূর্ণ/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ওয়েটলিস্টে যোগ দিন" }),
    ).toBeVisible();

    // --- switching the counter off hides it entirely ---
    await page.goto("/admin/batches");
    await page
      .locator("tr", { hasText: "CMU-BTEB Batch" })
      .getByRole("link", { name: "Edit" })
      .click();
    await page.waitForURL(/\/admin\/batches\/[^/]+$/);
    await page.locator("#field-showSeatCounter").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/batches$/);

    await page.goto("/bn/courses/cmu-bteb");
    await expect(
      page
        .locator("main > div")
        .first()
        .getByText(/সিট বাকি|সিট পূর্ণ/),
    ).toHaveCount(0);

    // Restore the seeded state so the suite can run again.
    await page.goto("/admin/batches");
    await page
      .locator("tr", { hasText: "CMU-BTEB Batch" })
      .getByRole("link", { name: "Edit" })
      .click();
    await page.waitForURL(/\/admin\/batches\/[^/]+$/);
    await page.locator("#field-showSeatCounter").check();
    await page.locator("#field-seats").fill("");
    await page.locator("#field-seatsFilled").fill("0");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/batches$/);
  });

  test("a batch can be cloned for the next session", async ({ page }) => {
    await page.goto("/admin/batches");

    await page
      .locator("tr", { hasText: "CMU Batch, Session 2026" })
      .getByRole("button", { name: "Clone batch" })
      .click();

    const dialog = page.getByRole("dialog");
    // The year in the name is bumped for you.
    await expect(dialog.locator("#clone-name")).toHaveValue("CMU Batch, Session 2027");

    const name = `CMU Batch, Session 2027 ${Date.now().toString(36)}`;
    await dialog.locator("#clone-name").fill(name);
    await dialog.locator("#clone-start").fill("2027-01-10");
    await dialog.getByRole("button", { name: "Copy" }).click();

    await page.waitForURL(/\/admin\/batches\/[^/]+$/);
    // A clone always starts as an empty upcoming batch.
    await expect(page.locator("#field-seatsFilled")).toHaveValue("0");
    await expect(page.locator("#field-status")).toHaveValue("UPCOMING");

    // Clean up.
    await page.goto("/admin/batches");
    const row = page.locator("tr", { hasText: name });
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("cell", { name })).toBeHidden();
  });
});
