import { chromium } from "@playwright/test";

/** Utility: screenshot a page at a given viewport. Not part of the test run. */
const [, , url, out, width = "1440", height = "1000", full] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +width, height: +height },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: full === "full" });
await browser.close();
