import { expect, test, type Page } from "@playwright/test";

/**
 * Addendum 3 end to end: certificate verification, board results, bulk
 * import, leadership pages, advisors and the hero slider. Each test creates
 * what it needs through the admin and removes it again.
 */

const stamp = () => Date.now().toString(36);

async function save(page: Page) {
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
}

async function deleteRow(page: Page, listPath: string, text: string) {
  await page.goto(listPath);
  const row = page.locator("tr", { hasText: text });
  await row.getByRole("button", { name: "মুছে ফেলুন" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "মুছে ফেলুন" }).click();
  await expect(page.locator("tr", { hasText: text })).toHaveCount(0);
}

test.describe("addendum 3", () => {
  test("a certificate verifies by number and by BMDC, and shows revocation", async ({
    page,
  }) => {
    const id = stamp();
    const roll = `A3-${id}`;
    const certNo = `MUTI-C-${id}`.toUpperCase();
    const studentName = `Dr. Verify ${id}`;

    // Student with a BMDC number written the untidy way.
    await page.goto("/admin/students/new");
    await page.locator("#field-name").fill(studentName);
    await page.locator("#field-roll").fill(roll);
    await page.locator("#field-bmdc").fill(`A-${id.slice(-5)}`);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await save(page);
    await page.waitForURL(/\/admin\/students$/);

    // Certificate for that student.
    await page.goto("/admin/certificates/new");
    await page.locator("#field-certificateNo").fill(certNo.toLowerCase());
    await page
      .locator("#field-studentId")
      .selectOption({ label: `${roll} — ${studentName}` });
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.locator("#field-grade").fill("4.00");
    await save(page);
    await page.waitForURL(/\/admin\/certificates$/);

    // Public: by certificate number, case-insensitively.
    await page.goto("/verify");
    await page.getByRole("textbox").fill(` ${certNo.toLowerCase()} `);
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    const card = page.getByTestId("verify-card");
    await expect(card).toContainText("বৈধ সনদ");
    await expect(card).toContainText(studentName);
    await expect(card).toContainText(certNo);

    // By BMDC with different punctuation.
    await page.getByRole("radio", { name: "BMDC নম্বর" }).check();
    await page.getByRole("textbox").fill(`a ${id.slice(-5)}`);
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    await expect(page.getByTestId("verify-card")).toContainText(certNo);

    // A wrong number says so and offers WhatsApp.
    await page.getByRole("textbox").fill("nope-000");
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    await expect(page.getByRole("status")).toContainText("কোনো রেকর্ড পাওয়া যায়নি");

    // Revoke from the admin; the public card turns red with the reason.
    await page.goto("/admin/certificates");
    await page
      .locator("tr", { hasText: certNo })
      .getByRole("link", { name: "সম্পাদনা" })
      .click();
    await page.locator("#field-status").selectOption("REVOKED");
    await page.locator("#field-revokedReason").fill("পরীক্ষার ফলাফল সংশোধিত");
    await save(page);
    await page.waitForURL(/\/admin\/certificates$/);

    await page.goto("/verify");
    await page.getByRole("textbox").fill(certNo);
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    await expect(page.getByTestId("verify-card")).toContainText("বাতিল করা হয়েছে");
    await expect(page.getByTestId("verify-card")).toContainText(
      "পরীক্ষার ফলাফল সংশোধিত",
    );

    // The lookups were logged.
    await page.goto("/admin/verification-logs");
    await expect(page.getByRole("cell", { name: certNo }).first()).toBeVisible();

    await deleteRow(page, "/admin/certificates", certNo);
    await deleteRow(page, "/admin/students", roll);
  });

  test("board results: paste a notice, publish, and search by roll", async ({
    page,
  }) => {
    const id = stamp();
    const title = `Smoke Exam ${id}`;
    // Ten digits, unique per millisecond, so parallel projects never collide.
    const passRoll = `38${String(Date.now()).slice(-8)}`;
    const failRoll = passRoll.slice(0, 9) + (passRoll.endsWith("1") ? "2" : "1");

    await page.goto("/admin/board-exams/new");
    await page.locator("#field-title").fill(title);
    await page.locator("#field-session").fill("Jan-June 2025");
    await page.locator("#field-published").check();
    await save(page);
    await page.waitForURL(/\/admin\/board-exams$/);

    await page
      .locator("tr", { hasText: title })
      .getByRole("link", { name: "ফলাফল" })
      .click();
    await page.getByRole("button", { name: "নোটিশ পেস্ট করুন" }).click();
    await page
      .getByPlaceholder(/3825000128/)
      .fill(`${passRoll} (4.00), ${failRoll} {01101[T], 01103[T,P]}`);
    await page.getByRole("button", { name: "পার্স করুন" }).click();
    await expect(page.getByLabel("সারি 1 রোল")).toHaveValue(passRoll);
    await page.getByRole("button", { name: "সব সংরক্ষণ" }).click();
    await expect(page.getByText(/2 নতুন/)).toBeVisible();

    await page.goto("/results");
    await page.getByRole("textbox").fill(passRoll);
    await page.getByRole("button", { name: "ফলাফল দেখুন" }).click();
    const card = page.getByTestId("result-card");
    await expect(card).toContainText(title);
    await expect(card).toContainText("উত্তীর্ণ");
    await expect(card).toContainText("GPA ৪.০০");

    await page.getByRole("textbox").fill(failRoll);
    await page.getByRole("button", { name: "ফলাফল দেখুন" }).click();
    await expect(page.getByTestId("result-card")).toContainText("অনুত্তীর্ণ");
    await expect(page.getByTestId("result-card")).toContainText("01103");
    await expect(page.getByTestId("result-card")).toContainText("[T,P]");

    // The exam is also browsable below the search.
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();

    await deleteRow(page, "/admin/board-exams", title);
  });

  test("advisors import from CSV, then group on the public page", async ({ page }) => {
    const id = stamp();
    const csv = [
      "name,designation,degrees,organization,category,sort_order",
      `Prof. Import One ${id},Professor,MBBS,Mymensingh Medical College,ADVISOR,1`,
      `Dr. Import Two ${id},Consultant,MBBS FCPS,,HONORARY,২`,
      `,Missing name,,,ADVISOR,3`,
    ].join("\n");

    await page.goto("/admin/import?entity=advisors");
    await page.locator('input[type="file"]').setInputFiles({
      name: `advisors-${id}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await expect(page.getByText("সঠিক 2")).toBeVisible();
    await expect(page.getByText("ভুল 1")).toBeVisible();
    await page.getByRole("button", { name: "৪. ইমপোর্ট করুন" }).click();
    await expect(page.getByText("ইমপোর্ট সম্পন্ন")).toBeVisible();

    await page.goto("/advisors");
    await expect(page.getByText(`Prof. Import One ${id}`)).toBeVisible();
    await expect(page.getByText(`Dr. Import Two ${id}`)).toBeVisible();
    // Grouped under the category headings from Site Settings.
    await expect(
      page.getByRole("heading", { level: 2, name: "উপদেষ্টা", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "সম্মানিত উপদেষ্টা", exact: true }),
    ).toBeVisible();

    // Templates download in both formats.
    for (const format of ["xlsx", "csv"]) {
      const response = await page.request.get(
        `/api/admin/import/template?entity=advisors&format=${format}`,
      );
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-disposition"]).toContain(`.${format}`);
    }

    await deleteRow(page, "/admin/advisors", `Prof. Import One ${id}`);
    await deleteRow(page, "/admin/advisors", `Dr. Import Two ${id}`);
  });

  test("a published leadership message appears on the homepage, its page and the nav", async ({
    page,
  }) => {
    await page.goto("/admin/leadership");
    await page
      .locator("tr", { hasText: "chairman" })
      .getByRole("link", { name: "সম্পাদনা" })
      .click();
    await page.locator("#field-personName").fill("Dr. Smoke Chairman");
    await page.locator("#field-published").check();
    await save(page);
    await page.waitForURL(/\/admin\/leadership$/);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "নেতৃত্বের বক্তব্য" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "পূর্ণ বক্তব্য পড়ুন" }).first().click();
    await expect(page).toHaveURL(/\/messages\/chairman$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "প্রতিষ্ঠান চেয়ারম্যান",
    );

    // Footer quick links carry the page too (the header dropdown is hover-only).
    await expect(
      page.locator("footer").getByRole("link", { name: "প্রতিষ্ঠান চেয়ারম্যান" }),
    ).toBeVisible();

    // Restore: unpublished again, name back to the placeholder.
    await page.goto("/admin/leadership");
    await page
      .locator("tr", { hasText: "chairman" })
      .getByRole("link", { name: "সম্পাদনা" })
      .click();
    await page.locator("#field-personName").fill("TODO: Chairman's name");
    await page.locator("#field-published").uncheck();
    await save(page);
    await page.waitForURL(/\/admin\/leadership$/);

    await page.goto("/messages/chairman");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "চেয়ারম্যান",
    );
  });

  test("the hero slider shows the seeded banners and moves with the arrows", async ({
    page,
  }, info) => {
    await page.goto("/");
    const slider = page.getByTestId("hero-slider");
    await expect(slider).toBeVisible();
    await expect(slider.getByRole("tab")).toHaveCount(3);
    await expect(slider.getByRole("heading", { level: 1 })).toContainText("সর্বপ্রথম");
    await expect(slider).toHaveAttribute("data-selected", "0");

    if (info.project.name === "mobile") {
      // Arrows are hidden on phones; the dots still work.
      await slider.getByRole("tab").nth(2).click();
    } else {
      await slider.getByRole("button", { name: "পরবর্তী" }).click();
      await slider.getByRole("button", { name: "পরবর্তী" }).click();
    }
    await expect(slider).toHaveAttribute("data-selected", "2");

    // The trust bar sits directly beneath.
    await expect(page.getByText("সরকার অনুমোদিত · কোড ৫৭১২৫")).toBeVisible();
  });
});
