import { expect, test } from "@playwright/test";

test("speaker name returns to the same list page", async ({ page }) => {
  await page.goto("/speakers", { waitUntil: "load" });
  await page.getByLabel("Search speakers").fill("a");
  await expect(page).toHaveURL(/[?&]q=a(?:&|$)/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/[?&]page=2(?:&|$)/);
  await expect(page.getByText(/Page 2 of/)).toBeVisible();

  const card = page.locator("[data-speaker-id]").first();
  const id = await card.getAttribute("data-speaker-id");
  expect(id).toBeTruthy();
  const name = ((await card.locator("h2 a").innerText()) ?? "").trim();
  expect(name.length).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 500));
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(200);
  await card.locator("h2 a").evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page).toHaveURL(new RegExp(`/people/${id}(?:$|\\?)`));
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await expect(page).toHaveURL(/\/speakers\?/);
  await expect(page).toHaveURL(/[?&]q=a(?:&|$)/);
  await expect(page).toHaveURL(/[?&]page=2(?:&|$)/);
  await expect(page.locator(`[data-speaker-id="${id}"]`)).toBeVisible();
  await expect.poll(async () => {
    const y = await page.evaluate(() => window.scrollY);
    return Math.abs(y - scrolled) <= 80;
  }).toBe(true);
});
