import { expect, test } from "@playwright/test";

/**
 * A super admin corrects an application after it was sent. The test edits a
 * field nothing else reads (location) and puts the old value back.
 */
test("a super admin corrects an application and the change is recorded", async ({
  page,
}) => {
  await page.goto("/admin/applications");
  await page.getByRole("button", { name: "Details" }).first().click();
  const href = await page.getByRole("link", { name: "Edit" }).getAttribute("href");
  expect(href).toMatch(/\/admin\/applications\/[^/]+\/edit$/);
  await page.goto(href!);

  const location = page.locator("#app-location");
  const original = await location.inputValue();
  const phone = page.locator("#app-phone");
  const originalPhone = await phone.inputValue();

  // The public form's rules apply: a bad number is refused and nothing saved.
  await phone.fill("12345");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Not a valid Bangladeshi mobile number.")).toBeVisible();
  await phone.fill(originalPhone);

  const edited = `Edited ${Date.now().toString(36)}`;
  await location.fill(edited);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved 1 change")).toBeVisible();
  await expect(
    page.getByText(`Location: ${original || "(empty)"} → ${edited}`),
  ).toBeVisible();

  // Put it back; that is recorded as well.
  await location.fill(original);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText(`Location: ${edited} → ${original || "(empty)"}`),
  ).toBeVisible();
});
