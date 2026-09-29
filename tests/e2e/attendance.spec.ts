import { expect, test, type Page } from "@playwright/test";

/**
 * Attendance (addendum 2, B1): classes generated from the course routine, the
 * register taken on a phone, and the percentage that comes out of it.
 *
 * The test builds its own batch and students and removes them afterwards.
 */

const stamp = () => Date.now().toString(36);

/**
 * Saving is retried until the list appears: on a cold dev server the click can
 * land before the form is interactive, and nothing happens at all.
 */
async function saveAndLeave(page: Page, list: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(list, { timeout: 4000 });
  }).toPass({ timeout: 40_000 });
}

/**
 * Best-effort cleanup. Whether the row leaves the list is asserted by the
 * soft-delete test in erp-foundations.spec.ts; here it is only tidying up, and
 * a tidy-up that fails must not report this test as broken.
 */
async function deleteRow(page: Page, listPath: string, text: string) {
  await page.goto(listPath);
  const row = page.locator("tr", { hasText: text });
  if ((await row.count()) === 0) return;
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(500);
}

test.describe("attendance", () => {
  test("classes are generated from the routine, marked, and counted", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const id = stamp();
    const batchName = `Attendance Batch ${id}`;
    const present = `Dr. Present ${id}`;
    const absent = `Dr. Absent ${id}`;

    // DMU is seeded with a full routine; the generator has nothing to do
    // without one, so the course cannot be picked by position.
    await page.goto("/admin/batches/new");
    await page.locator("#field-name").fill(batchName);
    const dmu = await page
      .locator("#field-courseId option", { hasText: "DMU" })
      .first()
      .getAttribute("value");
    await page.locator("#field-courseId").selectOption(dmu!);
    await page.locator("#field-classDays").fill("Saturday and Monday");
    await saveAndLeave(page, /\/admin\/batches$/);

    for (const [index, name] of [present, absent].entries()) {
      await page.goto("/admin/students/new");
      await page.locator("#field-name").fill(name);
      await page.locator("#field-roll").fill(`AT-${id}-${index}`);
      const dmu = await page
        .locator("#field-courseId option", { hasText: "DMU" })
        .first()
        .getAttribute("value");
      await page.locator("#field-courseId").selectOption(dmu!);
      await page.locator("#field-batchId").selectOption({ label: batchName });
      await saveAndLeave(page, /\/admin\/students$/);
    }

    try {
      // Generate the classes from the course routine.
      // Searched rather than scrolled: the batch list is paginated and a new
      // batch is not always on the first page.
      await page.goto(`/admin/batches?q=${encodeURIComponent(batchName)}`);
      const batchRow = page.locator("tr", { hasText: batchName });
      await batchRow.getByRole("link", { name: "Classes" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(batchName);

      await expect(async () => {
        await page.getByRole("button", { name: "Generate from routine" }).click();
        await expect(page.locator("[data-sonner-toast]")).toContainText(
          /classes added|already has a class/,
          { timeout: 2000 },
        );
      }).toPass({ timeout: 40_000 });

      // The table is re-rendered by a router refresh, so wait for it rather
      // than counting the moment the toast appears.
      const rows = page.locator("tbody tr");
      await expect(rows.first()).toBeVisible();
      const before = await rows.count();
      expect(before).toBeGreaterThan(0);

      // Pressing it again adds nothing: the routine rows already have classes.
      await page.getByRole("button", { name: "Generate from routine" }).click();
      // Both toasts can be on screen at once, so the one being checked is
      // picked out rather than matched against whatever is showing.
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "already has a class" }),
      ).toBeVisible();
      await page.reload();
      expect(await page.locator("tbody tr").count()).toBe(before);

      // Take the register: everybody present except one.
      await page
        .locator("tbody tr")
        .first()
        .getByRole("link", { name: "Register" })
        .click();
      await expect(page.getByText(/present/)).toBeVisible();
      await page.getByRole("button", { name: `Absent: ${absent}` }).click();
      await page.getByRole("button", { name: "Save register" }).click();
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "Register saved" }),
      ).toContainText("2 students");

      // The percentages follow: one attended everything, one attended nothing.
      // The row carries a Card link as well as the edit link, so the record is
      // opened by its id rather than by whichever link comes first.
      for (const [name, percent] of [
        [present, "100"],
        [absent, "0"],
      ] as const) {
        await page.goto(`/admin/students?q=${encodeURIComponent(name)}`);
        const card = await page
          .locator("tr", { hasText: name })
          .getByRole("link", { name: "Card" })
          .getAttribute("href");
        const studentId = card!.split("/")[3];
        await page.goto(`/admin/students/${studentId}`);
        await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
        await expect(page.getByText(`${percent}%`)).toBeVisible();
      }
    } finally {
      await deleteRow(
        page,
        `/admin/students?q=${encodeURIComponent(present)}`,
        present,
      );
      await deleteRow(page, `/admin/students?q=${encodeURIComponent(absent)}`, absent);
      await deleteRow(
        page,
        `/admin/batches?q=${encodeURIComponent(batchName)}`,
        batchName,
      );
    }
  });
});
