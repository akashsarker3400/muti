import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));

async function login() {
  await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#email", process.env.ADMIN_EMAIL);
  await page.fill("#password", process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
}

await login();

// 1. Create a notice through the generic resource form.
await page.goto(`${base}/admin/notices/new`, { waitUntil: "networkidle" });
// Unique per run so the slug never collides with an earlier check.
const stamp = Date.now().toString(36);
const noticeTitle = `পরীক্ষামূলক নোটিশ ${stamp}`;
await page.fill("#field-titleBn", noticeTitle);
await page.locator(".ProseMirror").first().click();
await page.keyboard.type("এটি একটি পরীক্ষামূলক নোটিশের বিবরণ।");
await page.selectOption("#field-category", "EXAM");
await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
await page.waitForURL(/\/admin\/notices$/, { timeout: 30000 });
const noticeVisible = await page.getByText(noticeTitle).count();
if (noticeVisible === 0) problems.push("notice not listed after create");

// 2. Check it appears on the public notice board.
await page.goto(`${base}/notices`, { waitUntil: "networkidle" });
if ((await page.getByText(noticeTitle).count()) === 0) {
  problems.push("notice missing from public /notices");
}

// 3. Save the course routine editor on an existing course.
await page.goto(`${base}/admin/courses`, { waitUntil: "networkidle" });
await page
  .getByRole("link", { name: /CMU \(রেগুলার\)/ })
  .first()
  .click();
await page.waitForURL(/\/admin\/courses\/[^/]+$/, { timeout: 30000 });
await page.getByRole("button", { name: "রুটিন সংরক্ষণ করুন" }).click();
await page.waitForTimeout(1500);

// 4. Site settings round trip.
await page.goto(`${base}/admin/settings`, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: "যোগাযোগ" }).click();
await page.fill("#field-contact\\.officeHoursBn", "শনি–বৃহস্পতি, সকাল ১০টা – রাত ৮টা");
await page.getByRole("button", { name: "সেটিংস সংরক্ষণ করুন" }).click();
await page.waitForURL(/\/admin$/, { timeout: 30000 });
await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
if ((await page.getByText("শনি–বৃহস্পতি").count()) === 0) {
  problems.push("office hours did not reach the public contact page");
}

// 5. Public admission application, end to end.
const context2 = await browser.newContext();
const visitor = await context2.newPage();
await visitor.goto(`${base}/apply`, { waitUntil: "networkidle" });
const applicantName = `ডা. পরীক্ষা রহমান ${stamp}`;
await visitor.getByRole("textbox", { name: "পূর্ণ নাম" }).fill(applicantName);
await visitor.getByRole("textbox", { name: "মোবাইল নম্বর" }).fill("01778838644");
await visitor.getByRole("combobox", { name: /^কোর্স/ }).selectOption({ index: 1 });
await visitor.getByRole("combobox", { name: /শিক্ষাগত যোগ্যতা/ }).selectOption("MBBS");
await visitor.getByRole("checkbox", { name: /আমি সম্মত/ }).check();
await visitor.getByRole("button", { name: /আবেদন জমা দিন/ }).click();
await visitor.waitForTimeout(2500);
const success = await visitor.getByText("আপনার আবেদন জমা হয়েছে").count();
if (success === 0) problems.push("admission form did not reach the success state");
await context2.close();

// 6. The application shows up in the admin inbox.
await page.goto(`${base}/admin/applications`, { waitUntil: "networkidle" });
if ((await page.getByText(applicantName).count()) === 0) {
  problems.push("application missing from the admin inbox");
}

console.log(problems.length === 0 ? "All flows OK ✓" : problems.join("\n"));
await browser.close();
