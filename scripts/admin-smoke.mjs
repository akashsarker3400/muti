import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle" });
await page.fill("#email", process.env.ADMIN_EMAIL);
await page.fill("#password", process.env.ADMIN_PASSWORD);
await Promise.all([
  page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 }),
  page.getByRole("button", { name: "লগইন" }).click(),
]);

const paths = [
  "/admin",
  "/admin/applications",
  "/admin/courses",
  "/admin/courses/new",
  "/admin/notices",
  "/admin/notices/new",
  "/admin/faculty",
  "/admin/testimonials",
  "/admin/faq",
  "/admin/partners",
  "/admin/banners",
  "/admin/downloads",
  "/admin/blog",
  "/admin/pages",
  "/admin/batches",
  "/admin/batches/new",
  "/admin/results",
  "/admin/students",
  "/admin/gallery",
  "/admin/gallery/new",
  "/admin/settings",
  "/admin/media",
  "/admin/users",
  "/admin/users/new",
  "/admin/activity",
];
let bad = 0;
for (const p of paths) {
  const res = await page.goto("http://localhost:3000" + p, {
    waitUntil: "domcontentloaded",
  });
  const status = res?.status();
  const hasError = await page.locator("text=Application error").count();
  if (status !== 200 || hasError) {
    console.log("FAIL", p, status, hasError);
    bad++;
  }
}
console.log(bad === 0 ? "All admin routes OK ✓" : `${bad} failures`);
await browser.close();
