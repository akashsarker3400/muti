import { expect, test, type Page } from "@playwright/test";

/**
 * The certificate workflow: bulk issue per batch, the approval gate, and the
 * handover register (id-card-certificate proposal, stage 3).
 *
 * The test creates its own batch and students through the admin and removes
 * everything again, so it can run against a database that already has real
 * records in it.
 */

const stamp = () => Date.now().toString(36);

async function save(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteRow(page: Page, listPath: string, text: string) {
  await page.goto(listPath);
  const row = page.locator("tr", { hasText: text });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("tr", { hasText: text })).toHaveCount(0);
}

test.describe("certificate workflow", () => {
  test("a batch is issued as drafts, cannot be printed until approved, and records the handover", async ({
    page,
  }) => {
    // Issuing and approving both ask for confirmation; accept every one.
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });

    const id = stamp();
    const batchName = `Cert Batch ${id}`;
    const students = [`Dr. Cert One ${id}`, `Dr. Cert Two ${id}`];
    const rolls = [`CW-${id}-1`, `CW-${id}-2`];

    // --- a batch with two completed students ---------------------------------
    await page.goto("/admin/batches/new");
    await page.locator("#field-name").fill(batchName);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await save(page);
    await expect(page).toHaveURL(/\/admin\/batches$/);

    for (const [index, name] of students.entries()) {
      await page.goto("/admin/students/new");
      await page.locator("#field-name").fill(name);
      await page.locator("#field-roll").fill(rolls[index]!);
      await page.locator("#field-courseId").selectOption({ index: 1 });
      await page.locator("#field-batchId").selectOption({ label: batchName });
      await page.locator("#field-status").selectOption("COMPLETED");
      await page.locator("#field-resultGrade").fill("4.00");
      await save(page);
      await expect(page).toHaveURL(/\/admin\/students$/);
    }

    // --- bulk issue ----------------------------------------------------------
    await page.goto("/admin/certificates/issue");
    // The option label carries the course code and the head count too, so the
    // batch is picked by its value rather than by an exact label.
    const batchValue = await page
      .locator("#batch option", { hasText: batchName })
      .getAttribute("value");
    await page.locator("#batch").selectOption(batchValue!);
    await page.getByRole("button", { name: "Load students" }).click();

    // Completed students come pre-ticked, which is the whole point of the page.
    await expect(page.locator("tr", { hasText: rolls[0]! })).toBeVisible();
    await expect(page.getByText(/2 of 2 ticked/)).toBeVisible();

    // Untick and retick one: the counter following along proves the page is
    // interactive. The retry matters on a cold dev server, where the client
    // bundle can still be compiling while the server-rendered page is visible.
    const firstTick = page.getByLabel(`Issue a certificate to ${students[0]!}`);
    await expect(async () => {
      await firstTick.click();
      await expect(page.getByText(/1 of 2 ticked/)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 30_000 });
    await firstTick.click();
    await expect(page.getByText(/2 of 2 ticked/)).toBeVisible();

    await page.locator("#cert-session").fill(`Session ${id}`);
    await page.getByRole("button", { name: /Issue 2 certificates/ }).click();
    await expect(page.getByText(/2 certificates prepared/)).toBeVisible();

    // Running it again must not hand the same students a second certificate.
    await page.reload();
    await expect(page.getByText("already has").first()).toBeVisible();
    await expect(page.getByText(/0 of 0 ticked/)).toBeVisible();

    // --- the approval gate ---------------------------------------------------
    await page.goto("/admin/certificates/register?state=draft");
    const draftRow = page.locator("tr", { hasText: students[0]! });
    await expect(draftRow).toContainText("Draft");
    const certificateNo = (await draftRow.locator("td").nth(1).innerText()).trim();

    // A draft is not printable even by opening the print URL directly. The
    // list's Print button opens a new tab, so the test follows the href itself.
    await page.goto("/admin/certificates");
    const listRow = page.locator("tr", { hasText: certificateNo });
    await expect(listRow).toBeVisible();
    const printHref = await listRow
      .getByRole("link", { name: "Print" })
      .getAttribute("href");
    await page.goto(printHref!);
    await expect(
      page.getByRole("heading", { level: 1, name: "Not approved yet" }),
    ).toBeVisible();

    // --- approve -------------------------------------------------------------
    await page.goto("/admin/certificates/register?state=draft");
    await page.getByLabel(/Tick all waiting/).check();
    await page.getByRole("button", { name: /^Approve/ }).click();
    await expect(page.getByText(/approved\./)).toBeVisible();

    await page.goto("/admin/certificates/register?state=approved");
    const approvedRow = page.locator("tr", { hasText: certificateNo });
    await expect(approvedRow).toContainText("Approved");

    // Now the certificate itself renders.
    await page.goto(printHref!);
    await expect(page.getByText(certificateNo).first()).toBeVisible();
    await expect(page.getByText("Scan to verify this certificate")).toBeVisible();

    // Printing records itself, so the register can answer "how many times". Run
    // on the wide project only: the count lives in a column mobile hides, and
    // the code path behind it does not depend on the viewport.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(async () => {
        await page
          .getByRole("button", { name: /Print certificate|Print again/ })
          .click();
        await page.goto(printHref!);
        await expect(page.getByText(/Printed \d+ time/)).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 30_000 });

      // A retried attempt may have printed twice, which is exactly what the
      // log is for, so the count is asserted as "recorded", not as "once".
      await page.goto("/admin/certificates/register?state=approved");
      await expect(page.locator("tr", { hasText: certificateNo })).toContainText(
        /\d+×/,
      );
    }

    // --- handover ------------------------------------------------------------
    await page.goto("/admin/certificates/register?state=approved");
    await page
      .locator("tr", { hasText: certificateNo })
      .getByRole("button", { name: "Handover" })
      .click();
    await page.getByLabel("Note").fill("Collected in person");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Handover recorded.")).toBeVisible();

    await page.goto("/admin/certificates/register?state=delivered");
    await expect(page.locator("tr", { hasText: certificateNo })).toContainText(
      students[0]!,
    );

    // --- clean up ------------------------------------------------------------
    // Certificates first: a student cannot be deleted while one points at them.
    for (const name of students) {
      await deleteRow(page, "/admin/certificates", name);
    }
    for (const name of students) {
      await deleteRow(page, "/admin/students", name);
    }
    await deleteRow(page, "/admin/batches", batchName);
  });
});

test.describe("admit cards", () => {
  test("one card per candidate of the batch sitting the examination", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const id = Date.now().toString(36);
    const batchName = `Admit Batch ${id}`;
    const studentName = `Dr. Candidate ${id}`;
    const examTitle = `Final Examination ${id}`;

    await page.goto("/admin/batches/new");
    await page.locator("#field-name").fill(batchName);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await save(page);
    await expect(page).toHaveURL(/\/admin\/batches$/);

    await page.goto("/admin/students/new");
    await page.locator("#field-name").fill(studentName);
    await page.locator("#field-roll").fill(`AC-${id}`);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.locator("#field-batchId").selectOption({ label: batchName });
    await page.locator("#field-boardRoll").fill(`38${String(Date.now()).slice(-8)}`);
    await save(page);
    await expect(page).toHaveURL(/\/admin\/students$/);

    await page.goto("/admin/board-exams/new");
    await page.locator("#field-title").fill(examTitle);
    await page.locator("#field-session").fill("Jan-June 2026");
    await page.locator("#field-batchId").selectOption({ label: batchName });
    await page.locator("#field-examTime").fill("10:00 am to 1:00 pm");
    await page.locator("#field-centre").fill("Mymensingh Polytechnic Institute");
    await save(page);
    await expect(page).toHaveURL(/\/admin\/board-exams$/);

    try {
      const row = page.locator("tr", { hasText: examTitle });
      const href = await row
        .getByRole("link", { name: "Admit cards" })
        .getAttribute("href");
      await page.goto(href!);

      // One A4 sheet for the one candidate, carrying what the hall needs.
      await expect(page.locator(".sheet")).toHaveCount(1);
      const card = page.locator(".sheet").first();
      await expect(card).toContainText("Admit Card");
      await expect(card).toContainText(studentName);
      await expect(card).toContainText("Mymensingh Polytechnic Institute");
      await expect(card).toContainText("10:00 am to 1:00 pm");
      // No date was set, so that line prints a rule to fill in by hand rather
      // than a gap the candidate cannot read.
      await expect(card).toContainText("Date of Examination");
      // English only, like the certificate and the registration card.
      await expect(card.locator('[lang="bn"]')).toHaveCount(0);
    } finally {
      await deleteRow(page, "/admin/board-exams", examTitle);
      await deleteRow(page, "/admin/students", studentName);
      await deleteRow(page, "/admin/batches", batchName);
    }
  });
});
