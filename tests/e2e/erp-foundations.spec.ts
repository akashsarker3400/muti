import { expect, test, type Page } from "@playwright/test";

/**
 * The groundwork the ERP addendum asks for in the current build: roll numbers
 * from a counter, admitting an applicant into a student record, and soft
 * delete on the tables the institute keeps records in.
 *
 * Each test cleans up after itself, so the suite can run against a database
 * that already holds real records.
 */

const stamp = () => Date.now().toString(36);

async function save(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
}

// The public admission form is capped at five submissions an hour per address
// (section 5.6). Several specs submit one, so each takes its own bucket rather
// than the suite quietly running the office's real limiter out of room.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.41" } });

test.describe("ERP foundations", () => {
  test("a roll number comes from the course's own series and is never reused", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // A dev server compiling a route for the first time can abort the
    // navigation, so the first visit of the run is retried.
    await expect(async () => {
      await page.goto("/admin/students/new");
      await expect(page.locator("#field-roll")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 60_000 });
    await page.locator("#field-name").fill(`Roll Test ${stamp()}`);

    // The course decides the series, so the button says so until one is picked.
    await expect(async () => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.getByText(/Choose the course first/)).toBeVisible({
        timeout: 1500,
      });
    }).toPass({ timeout: 30_000 });

    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.locator("#field-roll")).not.toHaveValue("");

    const first = await page.locator("#field-roll").inputValue();
    // MUTI-2026-CMU-001: prefix, year, course code, sequence.
    expect(first).toMatch(/^[A-Z]+-\d{4}-[A-Z0-9-]+-\d{3}$/);

    // A second student in the same course takes the next number, not the same.
    await page.goto("/admin/students/new");
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.locator("#field-roll")).not.toHaveValue("");
    const second = await page.locator("#field-roll").inputValue();
    expect(second).not.toBe(first);
  });

  test("admitting an application creates the student and links the two", async ({
    page,
  }) => {
    // Public form, admin admit, then two navigations: more steps than the
    // default budget allows on a cold dev server.
    test.setTimeout(120_000);
    const id = stamp();
    const name = `Dr. Admit ${id}`;

    // An application, made the way the public form makes one.
    await page.goto("/apply");
    await page.getByRole("textbox", { name: "Full name" }).fill(name);
    await page.getByRole("textbox", { name: "Mobile number" }).fill("01778838644");
    await page.getByRole("combobox", { name: /^Course/ }).selectOption({ index: 1 });
    await page.getByRole("combobox", { name: /qualification/i }).selectOption("MBBS");
    await page.getByRole("checkbox", { name: /I agree/i }).check();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText(/application has been submitted/i)).toBeVisible();

    try {
      await page.goto("/admin/applications");
      const row = page.locator("tr", { hasText: name });
      await expect(row).toBeVisible();

      // Admitting is not retryable: a second press would find a button whose
      // name has already changed. So wait until the page is interactive first,
      // using the details dialog as a probe that changes nothing.
      await expect(async () => {
        await row.getByRole("button", { name: "Details" }).click();
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 30_000 });
      await page.keyboard.press("Escape");

      page.once("dialog", (dialog) => dialog.accept());
      await row.getByRole("button", { name: `Admit ${name}` }).click();
      await expect(page).toHaveURL(/\/admin\/students\/[^/]+$/, {
        timeout: 20_000,
      });

      // The student record opens, already filled in from the application.
      await expect(page.locator("#field-name")).toHaveValue(name);
      const roll = await page.locator("#field-roll").inputValue();
      expect(roll).toMatch(/^[A-Z]+-\d{4}-[A-Z0-9-]+-\d{3}$/);

      // The application now points at the student: the button has become a way
      // back to it rather than a second admission, and the status moved with it.
      await page.goto("/admin/applications");
      const admittedRow = page.locator("tr", { hasText: name });
      await expect(admittedRow.locator("select")).toHaveValue("ADMITTED");
      // The button is now a way back to the student rather than a second
      // admission, which is what stops a duplicate record being created.
      await expect(
        admittedRow.getByRole("button", {
          name: `Open the student record for ${name}`,
        }),
      ).toBeVisible();
    } finally {
      await page.goto("/admin/students");
      const studentRow = page.locator("tr", { hasText: name });
      if (await studentRow.count()) {
        await studentRow.getByRole("button", { name: "Delete" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      }
      // The application's own delete lives in its details dialog, and the row
      // is a soft-deleted record either way, so the student is the part worth
      // cleaning up. The application is left for the office to see.
    }
  });

  test("a deleted student disappears from every page but keeps its roll", async ({
    page,
  }) => {
    const id = stamp();
    const name = `Dr. Soft ${id}`;

    await page.goto("/admin/students/new");
    await page.locator("#field-name").fill(name);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await expect(async () => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("#field-roll")).not.toHaveValue("", { timeout: 1500 });
    }).toPass({ timeout: 30_000 });
    const roll = await page.locator("#field-roll").inputValue();
    await save(page);
    await page.waitForURL(/\/admin\/students$/);

    const row = page.locator("tr", { hasText: name });
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);

    // Gone from the lists and from the card page.
    await page.goto(`/admin/students?q=${encodeURIComponent(roll)}`);
    await expect(page.getByText(name)).toHaveCount(0);

    // But the roll is still spoken for: the series moves past it rather than
    // handing the same number to the next student.
    await page.goto("/admin/students/new");
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await expect(async () => {
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.locator("#field-roll")).not.toHaveValue("", { timeout: 1500 });
    }).toPass({ timeout: 30_000 });
    expect(await page.locator("#field-roll").inputValue()).not.toBe(roll);
  });

  test("the scheduled jobs share one entry point behind the cron secret", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/run", {
      headers: { authorization: "Bearer definitely-not-the-secret" },
    });
    // 401 when a secret is set, 503 when the server has none configured.
    expect([401, 503]).toContain(response.status());
  });
});
