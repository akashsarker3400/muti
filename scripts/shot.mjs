import { chromium } from "@playwright/test";
const [, , url, out, width, height, full] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +width, height: +height },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: full === "full" });
await browser.close();
