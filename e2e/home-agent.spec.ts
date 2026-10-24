import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const IMPORT = "Import conference speakers and people you should meet";
const shots = "/opt/cursor/artifacts/screenshots";

test.beforeAll(async () => {
  await mkdir(shots, { recursive: true });
});

test("profile report, notes, and story chat", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/CUE/);
  await expect(page.getByText("Your conference co-pilot").first()).toBeVisible();
  await expect(page.getByText("Introvert Co-pilot")).toHaveCount(0);
  await expect(page.getByText("Introvert Copilot")).toHaveCount(0);
  const brand = page.locator('a[aria-label="CUE home"]:visible');
  await expect(brand).toHaveCount(1);
  const mark = await brand.locator("svg").boundingBox();
  expect(mark).not.toBeNull();
  expect(Math.round(mark?.height ?? 0)).toBe(info.project.name === "phone" ? 20 : 18);
  await brand.screenshot({ path: `${shots}/after-logo-${info.project.name}.png` });
  await page.screenshot({ path: `${shots}/after-home-${info.project.name}.png`, fullPage: true });
  await expect(page.getByRole("heading", { name: "Top matches" })).toHaveCount(0);
  await expect(page.getByText("Why you should meet")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "GitHub Universe 2026" })).toBeVisible();
  await expect(page.getByText("October 28 to 29, 2026")).toBeVisible();
  await expect(page.getByText("Fort Mason Center, San Francisco, CA")).toBeVisible();
  await expect(page.getByText("183", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/scraped live from the public conference site/)).toBeVisible();

  const toggle = page.getByRole("button", { name: "Show your report" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Hide your report" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Your report" })).toBeVisible();
  await expect(page.getByText("Degree: gap")).toBeVisible();
  await expect(page.getByText("Experience history: gap")).toBeVisible();
  await noHorizontalOverflow(page);
  await expect(page.getByRole("link", { name: "Chat with the agent about my story" })).toBeVisible();
  await page.screenshot({ path: `${shots}/after-report-${info.project.name}.png`, fullPage: true });

  const notes = page.getByLabel("Notes");
  await notes.fill("Remember the Animori partners.");
  await page.reload();
  await page.getByRole("button", { name: "Show your report" }).click();
  await expect(page.getByLabel("Notes")).toHaveValue("Remember the Animori partners.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("your-report.md");

  await page.getByRole("button", { name: "Hide your report" }).click();
  await expect(page.getByRole("heading", { name: "Your report" })).toBeHidden();

  await page.goto("/me");
  await expect(page.getByText("In your own words")).toHaveCount(0);
  await expect(page.getByLabel("Your sentence")).toHaveCount(0);
  await page.screenshot({ path: `${shots}/after-story-${info.project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: "Chat with the agent about my story" }).click();
  await expect(page).toHaveURL(/start=story/);
  await expect(page.getByText("Talk about my story", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/gap/i).first()).toBeVisible();
  await expect(page.getByText("Here is a plan you can say out loud")).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test("import flow reveals ranked people and keeps the actions", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: IMPORT }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuetext", /Reading|Matching against your story|Ranking by who you can actually talk to/);
  await expect(page.getByRole("heading", { name: "Top matches" })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/Showing 48 of 183 speakers ranked for you/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strong matches" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Also worth meeting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse all 183 speakers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the full Who to meet" })).toBeVisible();
  await page.screenshot({ path: `${shots}/after-results-${info.project.name}.png`, fullPage: false });
  await noHorizontalOverflow(page);

  const top = page.locator("section").filter({ has: page.getByRole("heading", { name: "Top matches", exact: true }) });
  const person = (await top.getByRole("heading", { level: 3 }).first().textContent())?.trim() ?? "";
  expect(person.length).toBeGreaterThan(0);
  const save = top.getByRole("button", { name: `Save ${person}` });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(top.getByRole("button", { name: `Remove ${person} from who I want to talk to` })).toBeVisible();

  await top.getByRole("button", { name: "Mark as met" }).first().click();
  await expect(top.getByRole("heading", { level: 3, name: person })).toHaveCount(0);

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: person })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Top matches" })).toBeVisible();

  await page.getByRole("button", { name: "Run it again" }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top matches" })).toBeVisible({ timeout: 12_000 });
});

test("reduced motion skips the import animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: IMPORT }).click();
  await expect(page.getByRole("heading", { name: "Top matches" })).toBeVisible({ timeout: 2_000 });
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("ask the agent starts empty, keeps speaker prompts, and the draft card works", async ({ page }, info) => {
  await page.goto("/agent");
  await expect(page.getByRole("heading", { name: "I know your story and every GitHub Universe speaker. Ask me anything." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk about my story" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk about a speaker" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Help me understand the conference" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Who should I meet first?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draft a follow-up I can copy" })).toBeVisible();
  await expect(page.getByText("Here is a plan you can say out loud")).toHaveCount(0);
  await expect(page.getByText("10 second intro")).toHaveCount(0);
  await expect(page.getByText("Catalog plan")).toHaveCount(0);
  await page.screenshot({ path: `${shots}/after-agent-${info.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Draft a follow-up I can copy" }).click();
  const generalCard = page.getByRole("article").filter({ hasText: "You review and send it yourself" });
  await expect(generalCard).toBeVisible();
  await exerciseDraftCard(page, generalCard, false);

  await page.getByRole("button", { name: "Talk about a speaker" }).click();
  await expect(page.getByText("Which speaker")).toBeVisible();
  await page.getByLabel("Find a speaker").fill("Mario Rodriguez");
  await page.getByRole("button", { name: /Mario Rodriguez/ }).click();
  await expect(page.getByText("About this speaker")).toBeVisible();
  await expect(page.getByRole("button", { name: "Give me an opener for Mario" })).toBeVisible();

  await page.goto("/people/mario-rodriguez");
  await page.getByRole("link", { name: "Ask the agent" }).click();
  await expect(page).toHaveURL(/\/agent\?person=mario-rodriguez/);
  await expect(page.getByText("Here is a plan you can say out loud")).toHaveCount(0);
  await expect(page.getByText("Catalog plan")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Give me an opener for Mario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "What should I say about myself?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Give me 2 questions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draft a follow-up I can copy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "How do I introduce myself in 10 seconds?" })).toHaveCount(0);
  await page.screenshot({ path: `${shots}/after-agent-speaker-${info.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Give me an opener for Mario" }).click();
  await expect(page.getByText("Two questions")).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "You review and send it yourself" })).toBeVisible();

  await page.getByRole("button", { name: "Draft a follow-up I can copy" }).click();
  const card = page.getByRole("article").filter({ hasText: "You review and send it yourself" }).last();
  await expect(card).toBeVisible();
  await exerciseDraftCard(page, card, true);
  await page.screenshot({ path: `${shots}/after-agent-draft-${info.project.name}.png`, fullPage: true });
  await noHorizontalOverflow(page);
});

test("conversation plan opens from a home match", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: IMPORT }).click();
  const top = page.locator("section").filter({ has: page.getByRole("heading", { name: "Top matches", exact: true }) });
  await expect(top.getByRole("link", { name: "Conversation plan" }).first()).toBeVisible();
  await top.getByRole("link", { name: "Conversation plan" }).first().click();
  await expect(page).toHaveURL(/\/people\//);
  await page.goBack();
  await top.getByRole("link", { name: "Ask agent" }).first().click();
  await expect(page).toHaveURL(/\/agent\?person=/);
  await expect(page.getByRole("button", { name: /Give me an opener for/ })).toBeVisible();
  await expect(page.getByText("Here is a plan you can say out loud")).toHaveCount(0);
});

test("reset clears notes and the import", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Show your report" }).click();
  await page.getByLabel("Notes").fill("Clear me on reset.");
  await page.getByRole("button", { name: IMPORT }).click();
  await expect(page.getByRole("heading", { name: "Top matches" })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click({ force: true });
  await expect(page.getByRole("button", { name: IMPORT })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top matches" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show your report" }).click();
  await expect(page.getByLabel("Notes")).toHaveValue("");
});

async function exerciseDraftCard(
  page: import("@playwright/test").Page,
  card: import("@playwright/test").Locator,
  linkedin: boolean,
) {
  const mail = card.getByRole("link", { name: "Open in my email" });
  await expect(mail).toHaveAttribute("href", /^mailto:/);
  expect(await mail.getAttribute("href")).toContain("subject=");
  await card.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(card.getByText("Copied.", { exact: true })).toBeVisible();
  const emailCopy = await page.evaluate(() => navigator.clipboard.readText());
  expect(emailCopy.length).toBeGreaterThan(20);
  await card.getByRole("button", { name: "Copy for LinkedIn" }).click();
  await expect(card.getByText("LinkedIn note copied.")).toBeVisible();
  const note = await page.evaluate(() => navigator.clipboard.readText());
  expect(note.length).toBeGreaterThan(10);
  if (linkedin) {
    await expect(card.getByRole("link", { name: "Open LinkedIn profile" })).toHaveAttribute("href", /linkedin\.com\/in\//);
  } else {
    await expect(card.getByRole("link", { name: "Open LinkedIn profile" })).toHaveCount(0);
  }
  await card.getByRole("button", { name: "Send anywhere" }).click();
  await expect(card.getByText("Copied. Paste it into the app you want.")).toBeVisible();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared.length).toBeGreaterThan(20);
}

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
}
