import { expect, test, type Page } from "@playwright/test";

/**
 * Fees (addendum 2, B2): a plan built from the course price, a payment taken
 * at the desk, the receipt that proves it, and the void that cancels one
 * without deleting it.
 */

const stamp = () => Date.now().toString(36);

async function saveAndLeave(page: Page, list: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(list, { timeout: 4000 });
  }).toPass({ timeout: 40_000 });
}

test.describe("fees", () => {
  test("a plan, a payment, a receipt and a void", async ({ page }) => {
    test.setTimeout(150_000);
    const id = stamp();
    const name = `Dr. Payer ${id}`;

    await page.goto("/admin/students/new");
    await page.locator("#field-name").fill(name);
    await page.locator("#field-roll").fill(`FEE-${id}`);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await saveAndLeave(page, /\/admin\/students$/);

    const card = await page
      .locator("tr", { hasText: name })
      .getByRole("link", { name: "Card" })
      .getAttribute("href");
    const studentId = card!.split("/")[3];

    try {
      await page.goto(`/admin/students/${studentId}/fees`);
      await expect(page.getByText("No fee plan yet.")).toBeVisible();

      // Build the plan: half at admission, the balance monthly.
      await expect(async () => {
        await page.getByRole("button", { name: "Create the fee plan" }).click();
        await expect(page.getByLabel("Monthly instalments")).toBeVisible({
          timeout: 1500,
        });
      }).toPass({ timeout: 40_000 });
      await page.getByLabel("Monthly instalments").fill("3");
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await expect(page.getByText("Instalments")).toBeVisible();

      // Four rows: the admission half and three months.
      const rows = page.locator("table tr");
      // The label appears in the table and again in the payment form's list,
      // so the first match is the one being checked.
      await expect(page.getByText("At admission").first()).toBeVisible();
      await expect(page.getByText("Instalment 3").first()).toBeVisible();
      expect(await rows.count()).toBeGreaterThan(3);

      // Take a payment; the form offers the next instalment and its balance.
      await expect(async () => {
        await page.getByRole("button", { name: "Take a payment" }).click();
        await expect(page.getByLabel("Amount (Taka)")).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 40_000 });
      const offered = await page.getByLabel("Amount (Taka)").inputValue();
      expect(Number(offered)).toBeGreaterThan(0);

      await page.getByRole("button", { name: "Take payment" }).click();
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: "Receipt" }),
      ).toBeVisible();

      // The instalment is now paid and the receipt is listed.
      await expect(page.getByText("Paid").first()).toBeVisible();
      const receiptLink = page.getByRole("link", { name: "Receipt" }).first();
      const receiptHref = await receiptLink.getAttribute("href");

      // The printed receipt says the amount in figures and in words.
      await page.goto(receiptHref!);
      await expect(page.getByText("Money Receipt").first()).toBeVisible();
      await expect(page.getByText(/taka only/i).first()).toBeVisible();
      // Both halves are there: one for the student, one for the file. The
      // help text above the sheet mentions them too, hence the sheet scope.
      const sheet = page.locator(".sheet");
      await expect(sheet.getByText("Student's copy")).toBeVisible();
      await expect(sheet.getByText("Office copy")).toBeVisible();

      // Voiding cancels the receipt without deleting it, and the instalment
      // goes back to being owed.
      await page.goto(`/admin/students/${studentId}/fees`);
      page.once("dialog", (dialog) => dialog.accept("Taken in error by the test"));
      await expect(async () => {
        await page.getByRole("button", { name: /^Cancel receipt/ }).click();
        await expect(
          page.locator("[data-sonner-toast]").filter({ hasText: "cancelled" }),
        ).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 40_000 });

      await page.reload();
      await expect(page.getByText("Cancelled").first()).toBeVisible();
      await expect(page.getByText("Taken in error by the test")).toBeVisible();
    } finally {
      await page.goto(`/admin/students?q=${encodeURIComponent(name)}`);
      const row = page.locator("tr", { hasText: name });
      if (await row.count()) {
        await row.getByRole("button", { name: "Delete" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await page.waitForTimeout(500);
      }
    }
  });
});
