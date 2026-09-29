import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Homepage additions (promos, videos) and addendum 5 (course book). Each test
 * creates what it needs through the admin or its upload APIs and removes it
 * again, so the suite can run repeatedly.
 */

const stamp = () => Date.now().toString(36);

/** 1×1 PNG: enough for the uploader, which converts to webp. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function uploadImage(page: Page): Promise<string> {
  const response = await page.request.post("/api/admin/upload?max=5", {
    multipart: { file: { name: "poster.png", mimeType: "image/png", buffer: PNG } },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { url: string }).url;
}

/** Generic resource lists render rows as <tr>; promos and videos use <li>. */
async function deleteTableRow(page: Page, listPath: string, text: string) {
  await page.goto(listPath);
  const row = page.locator("tr", { hasText: text }).first();
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("tr", { hasText: text })).toHaveCount(0);
}

async function deleteRow(page: Page, listPath: string, text: string) {
  await page.goto(listPath);
  const row = page.locator("li", { hasText: text }).first();
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("li", { hasText: text })).toHaveCount(0);
}

test.describe("homepage promos", () => {
  test("a promo in each slot shows on the homepage, rotates, and counts clicks", async ({
    page,
  }) => {
    const id = stamp();
    const image = await uploadImage(page);

    for (const [slot, title] of [
      ["PROMO_A", `Promo A ${id}`],
      ["PROMO_B", `Promo B ${id}`],
    ] as const) {
      await page.goto("/admin/promos/new");
      await page.locator("#field-title").fill(title);
      await page.locator("#field-slot").selectOption(slot);
      await page.locator("#field-image").fill(image);
      await page.locator("#field-link").fill("/admission");
      if (slot === "PROMO_A") await page.locator("#field-isOffer").check();
      // Live preview renders from the current values before saving.
      await expect(page.getByText("Preview", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForURL(/\/admin\/promos$/);
      await expect(page.getByText(title)).toBeVisible();
    }

    try {
      await page.goto("/");
      const slotA = page.getByTestId("promo-PROMO_A");
      const slotB = page.getByTestId("promo-PROMO_B");
      await expect(slotA).toBeVisible();
      await expect(slotB).toBeVisible();
      await expect(slotA.getByText("Offer")).toBeVisible();
      await expect(slotB.getByText("Offer")).toHaveCount(0);
      // Slot A sits directly under the stats strip; on phones it is capped.
      const box = await slotA.locator("a").first().boundingBox();
      expect(box?.height ?? 0).toBeLessThanOrEqual(
        page.viewportSize()!.width < 640 ? 320 : 600,
      );

      // Clicking follows the link and the counter goes up.
      await slotA.locator("a").first().click();
      await expect(page).toHaveURL(/\/admission$/);
      await page.goto("/admin/promos");
      await expect(
        page.locator("li", { hasText: `Promo A ${id}` }).getByText(/1 clicks?/),
      ).toBeVisible();

      // A second active promo in slot A turns it into a rotation with dots.
      await page.goto("/admin/promos/new");
      await page.locator("#field-title").fill(`Promo A2 ${id}`);
      await page.locator("#field-slot").selectOption("PROMO_A");
      await page.locator("#field-image").fill(image);
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForURL(/\/admin\/promos$/);
      await page.goto("/");
      await expect(page.getByTestId("promo-PROMO_A").getByRole("tab")).toHaveCount(2);
    } finally {
      for (const title of [`Promo A ${id}`, `Promo A2 ${id}`, `Promo B ${id}`]) {
        await deleteRow(page, "/admin/promos", title).catch(() => undefined);
      }
    }
  });

  test("a scheduled promo outside its window is not shown", async ({ page }) => {
    const id = stamp();
    const image = await uploadImage(page);
    await page.goto("/admin/promos/new");
    await page.locator("#field-title").fill(`Future promo ${id}`);
    await page.locator("#field-image").fill(image);
    await page.locator("#field-startAt").fill("2999-01-01");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/promos$/);
    try {
      await expect(page.locator("li", { hasText: `Future promo ${id}` })).toContainText(
        "Scheduled / expired",
      );
      await page.goto("/");
      await expect(
        page.locator(`[data-promo]`, { hasText: `Future promo ${id}` }),
      ).toHaveCount(0);
    } finally {
      await deleteRow(page, "/admin/promos", `Future promo ${id}`);
    }
  });
});

test.describe("institute video", () => {
  test("a YouTube link becomes the lazy homepage video and a gallery tab", async ({
    page,
  }) => {
    const id = stamp();
    await page.goto("/admin/videos/new");
    await page.locator("#video-title").fill(`Campus tour ${id}`);
    await page
      .locator("#video-embed")
      .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/videos$/);

    try {
      await page.goto("/");
      const player = page.getByTestId("video-player").first();
      await expect(
        page.getByRole("heading", { name: "MUTI in 1 minute" }),
      ).toBeVisible();
      // Nothing from YouTube until play is pressed.
      await expect(player.locator("iframe")).toHaveCount(0);
      await player.click();
      await expect(player.locator("iframe")).toHaveAttribute(
        "src",
        /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
      );
      // VideoObject structured data is in the HTML.
      const jsonLd = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      expect(jsonLd.some((text) => text.includes('"VideoObject"'))).toBe(true);

      await page.goto("/gallery?tab=videos");
      await expect(
        page.getByTestId("video-grid").getByText(`Campus tour ${id}`),
      ).toBeVisible();
    } finally {
      await deleteRow(page, "/admin/videos", `Campus tour ${id}`);
    }
  });

  test("a non-video link is refused with a clear message", async ({ page }) => {
    await page.goto("/admin/videos/new");
    await page.locator("#video-title").fill("Bad link");
    await page.locator("#video-embed").fill("https://example.com/video");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByText("Only YouTube and Facebook video links are supported").first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/videos\/new$/);
  });
});

test.describe("course book (addendum 5)", () => {
  /** Publishes the seeded book with a freshly stamped sample PDF. */
  async function publishBook(page: Page) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf
      .addPage([595, 842])
      .drawText("Chapter 01: USG Physics (test)", { x: 60, y: 760, size: 18, font });
    const buffer = Buffer.from(await pdf.save());

    await page.goto("/admin/course-book");
    // The upload API needs the book id; the chapter list carries it.
    const id = await page.getAttribute("[data-testid='book-chapters']", "data-book-id");
    expect(id).toBeTruthy();
    const upload = await page.request.post("/api/admin/upload/sample-pdf", {
      multipart: {
        bookId: id!,
        file: { name: "chapter-01.pdf", mimeType: "application/pdf", buffer },
      },
    });
    expect(upload.ok()).toBe(true);

    await page.goto("/admin/course-book");
    await page.locator("#field-published").check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByText("Published at /course-book/easy-ultrasound"),
    ).toBeVisible();
  }

  async function unpublishBook(page: Page) {
    await page.goto("/admin/course-book");
    await page.locator("#field-published").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Unpublished", { exact: true })).toBeVisible();
  }

  test("the book page, the sample lead flow and the protected PDF", async ({
    page,
  }) => {
    await publishBook(page);
    const name = `Dr. Sample ${stamp()}`;

    try {
      // Public page with the 13 chapters and the form.
      await page.goto("/course-book/easy-ultrasound");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Easy Ultrasound",
      );
      await expect(page.getByTestId("book-chapters").locator("> li")).toHaveCount(13);
      await expect(page.getByText("USG Physics", { exact: true })).toBeVisible();
      await expect(page.getByText("Cul-de-sac")).toBeVisible();
      await expect(
        page.getByTestId("book-chapters").getByText("Free sample"),
      ).toBeVisible();
      // No em dashes anywhere on the page.
      expect(await page.locator("body").innerText()).not.toContain("—");

      // /sample is a short address for the form.
      await page.goto("/course-book/easy-ultrasound/sample");
      await expect(page).toHaveURL(/\/course-book\/easy-ultrasound#sample$/);

      // Lead capture.
      await page.getByRole("textbox", { name: "Full name" }).fill(name);
      await page.getByRole("textbox", { name: "Mobile number" }).fill("01778838644");
      await page.getByRole("combobox", { name: /Qualification/ }).selectOption("MBBS");
      await page.getByRole("button", { name: "Get the sample chapter" }).click();
      const success = page.getByTestId("book-sample-success");
      await expect(success).toBeVisible();
      const href = await page.getByTestId("book-sample-download").getAttribute("href");
      expect(href).toMatch(/^\/api\/v1\/book\/sample\?token=/);

      // The token streams the stamped PDF; without it there is nothing.
      const download = await page.request.get(href!);
      expect(download.status()).toBe(200);
      expect(download.headers()["content-type"]).toBe("application/pdf");
      expect((await download.body()).subarray(0, 5).toString()).toBe("%PDF-");
      expect((await page.request.get("/api/v1/book/sample")).status()).toBe(403);
      expect((await page.request.get(`${href}x`)).status()).toBe(403);

      // The office sees the lead, its type filter and the download count.
      await page.goto("/admin/applications?type=BOOK_SAMPLE");
      const row = page.getByRole("row", { name: new RegExp(name) });
      await expect(row).toBeVisible();
      await expect(row).toContainText("Book sample");
      await expect(row).toContainText("1 download");
      await page.goto("/admin");
      await expect(page.getByText("Sample downloads this month")).toBeVisible();

      // Course pages linked to the book show the section; DMU adds the semester line.
      await page.goto("/courses/dmu");
      const section = page.getByTestId("course-book-section");
      await expect(section).toContainText("13 chapters, included in the book fee");
      await expect(section).toContainText("Used in 1st semester");
      await expect(section).toContainText("and 8 more");
      await page.goto("/courses/cmu-regular");
      await expect(page.getByTestId("course-book-section")).not.toContainText(
        "Used in 1st semester",
      );

      // Homepage strip, and the Site Settings switch that hides it.
      await page.goto("/");
      await expect(page.getByTestId("book-strip")).toContainText("Easy Ultrasound");
      await expect(
        page.locator("footer").getByRole("link", { name: "Course book" }),
      ).toBeVisible();
    } finally {
      await page.goto("/admin/applications?type=BOOK_SAMPLE");
      const row = page.getByRole("row", { name: new RegExp(name) });
      if (await row.count()) {
        await row.getByRole("button", { name: "Details" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
      }
      await unpublishBook(page);
    }

    // Unpublished: 404 on the page, nothing on the course page or the nav.
    expect((await page.request.get("/course-book/easy-ultrasound")).status()).toBe(404);
    await page.goto("/courses/dmu");
    await expect(page.getByTestId("course-book-section")).toHaveCount(0);
  });

  test("the eight blog drafts exist, need review and carry no images", async ({
    page,
  }) => {
    for (const title of [
      "Echogenicity explained",
      "Posterior acoustic shadow vs enhancement",
      "Fatty liver vs chronic liver disease",
      "Normal liver, spleen and kidney measurements",
      "Grading hydronephrosis",
      "How to measure prostate volume",
      "Endometrial thickness by menstrual phase",
      "AFI and placenta grading",
    ]) {
      await page.goto(`/admin/blog?q=${encodeURIComponent(title)}`);
      const row = page.locator("tr", { hasText: title }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText("Needs faculty review");
      // Drafts carry no cover image: the image cell is an empty placeholder.
      await expect(row.locator("img")).toHaveCount(0);
    }
    // Drafts are not on the public blog.
    await page.goto("/blog");
    await expect(page.getByText("Echogenicity explained")).toHaveCount(0);
  });
});

test.describe("printed documents", () => {
  test("the certificate, the cards and the public card page", async ({ page }) => {
    const id = stamp();
    const roll = `DOC-${id}`;

    // A student with a photo, then a certificate for them.
    const image = await uploadImage(page);
    await page.goto("/admin/students/new");
    await page.locator("#field-name").fill(`Dr. Document ${id}`);
    await page.locator("#field-roll").fill(roll);
    await page.locator("#field-photo").fill(image);
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/students$/);

    // The number generator takes the next one in the series, then the office
    // can still overwrite it for an older certificate.
    await page.goto("/admin/certificates/new");
    await page.locator("#field-courseId").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.locator("#field-certificateNo")).not.toHaveValue("");
    const generated = await page.locator("#field-certificateNo").inputValue();
    expect(generated).toMatch(/^[A-Z]+-[A-Z-]+-\d{4}-\d{4}$/);

    const certNo = `DOC-C-${id}`.toUpperCase();
    await page.locator("#field-certificateNo").fill(certNo);
    await page
      .locator("#field-studentId")
      .selectOption({ label: `${roll} — Dr. Document ${id}` });
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/admin\/certificates$/);

    try {
      // Certificate: the row button opens a printable page carrying the number.
      const certRow = page.locator("tr", { hasText: certNo });
      const certHref = await certRow
        .getByRole("link", { name: "Print" })
        .getAttribute("href");
      expect(certHref).toMatch(/\/admin\/certificates\/[^/]+\/print$/);
      await page.goto(certHref!);
      await expect(page.locator(".sheet")).toBeVisible();
      await expect(page.getByText(certNo, { exact: true })).toBeVisible();
      await expect(page.getByText(`Dr. Document ${id}`)).toBeVisible();
      // The QR is inline SVG, so the printer gets vector edges.
      expect(await page.locator(".sheet svg").count()).toBeGreaterThan(1);
      // It must carry a quiet zone, or printed paper does not scan reliably.
      const qr = page.locator('.sheet svg[aria-label="QR code"]');
      await expect(qr).toHaveAttribute("width", /\d+/);

      // Registration card and wallet card.
      await page.goto("/admin/students");
      const studentRow = page.locator("tr", { hasText: roll });
      const cardHref = await studentRow
        .getByRole("link", { name: "Card" })
        .getAttribute("href");
      await page.goto(cardHref!);
      await expect(page.getByText("Student Registration Card")).toBeVisible();
      await expect(page.getByText(roll)).toBeVisible();
      await page.getByRole("link", { name: /Wallet card/ }).click();
      await expect(page).toHaveURL(/view=wallet$/);
      await expect(page.getByText("Student Identity Card")).toBeVisible();

      // The QR opens a public page that shows the photo, and a tweaked token 404s.
      await page.goto(cardHref!);
      const url = await page
        .getByText(/\/card\//)
        .first()
        .textContent();
      const token = url!.split("/card/")[1]!.replace("…", "");
      const response = await page.request.get(`/card/${token}x`);
      expect(response.status()).toBe(404);
    } finally {
      await deleteTableRow(page, "/admin/certificates", certNo).catch(() => undefined);
      await deleteTableRow(page, "/admin/students", roll).catch(() => undefined);
    }
  });
});

test.describe("admin security", () => {
  test("the security page offers two-factor and states the lockout policy", async ({
    page,
  }) => {
    await page.goto("/admin/security");
    await expect(
      page.getByRole("heading", { name: "Two-factor authentication" }),
    ).toBeVisible();
    await expect(page.getByText(/Eight failed attempts lock an account/)).toBeVisible();

    // Enrolment renders a QR and offers the key for manual entry, and nothing
    // is stored until a code confirms it.
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.locator("svg[aria-label='QR code']")).toBeVisible();
    await page.getByText("Cannot scan the code?").click();
    await expect(page.locator("code")).toContainText(/^[A-Z2-7]{16,}$/);

    // A wrong code does not enable it.
    await page.locator("#totp-code").fill("000000");
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText(/did not match/)).toBeVisible();
    await page.goto("/admin/security");
    await expect(page.getByRole("button", { name: "Turn on" })).toBeVisible();
  });

  test("security headers are served on the public site", async ({ page }) => {
    const response = await page.request.get("/");
    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("form-action 'self'");
    expect(headers["strict-transport-security"]).toContain("max-age=");
  });

  test("the admin panel is never indexable", async ({ page }) => {
    const response = await page.request.get("/admin/login");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });
});
