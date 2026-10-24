import assert from "node:assert/strict";
import { test } from "node:test";
import { reportPlainText, storyPromptBlock, storyReport } from "./story-context";

const DASH = /[\u2013\u2014]/;

test("the story report uses the profile and marks gaps", () => {
  const report = storyReport();
  const text = reportPlainText(report);
  assert.equal(report.name, "Henry Finn");
  assert.match(report.headline, /Unicorn Studios/);
  assert.ok(report.chips.includes("Anime and comics IP"));
  assert.match(text, /Who you are/);
  assert.match(text, /What you build/);
  assert.match(text, /Animori/);
  assert.match(text, /Developers/);
  assert.match(text, /Creators/);
  assert.match(text, /Investors/);
  assert.match(text, /BLACKPINK/);
  assert.match(text, /What to avoid saying/);
  assert.match(text, /hates selling himself/i);
  assert.match(text, /Ask about what they are building before talking about yourself/);
  assert.match(text, /Three ways to introduce yourself/);
  assert.match(text, /looking for engineers who want to build the tools/);
  assert.match(text, /Experience history: gap/);
  assert.match(text, /Education history: gap/);
  assert.match(text, /Degree: gap/);
  assert.match(text, /Executive Intelligence/);
  assert.match(text, /Description: gap/);
  assert.match(text, /https:\/\/www\.linkedin\.com\/in\/henryfinnco/);
  assert.equal(text.includes("Samsung"), false);
  assert.equal(DASH.test(text), false);
  assert.equal(DASH.test(storyPromptBlock()), false);
  assert.match(storyPromptBlock(), /VERIFIED STORY/);
  assert.match(storyPromptBlock(), /NDA/);
});
