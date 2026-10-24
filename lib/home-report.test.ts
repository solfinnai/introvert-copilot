import assert from "node:assert/strict";
import { test } from "node:test";
import { homeReportMarkdown } from "./home-report";
import { storyReport } from "./story-context";

const DASH = /[\u2013\u2014]/;

test("downloaded report includes the profile, the gaps, and the notes", () => {
  const markdown = homeReportMarkdown(storyReport(), "Remember the Animori partners.");
  assert.match(markdown, /^# Henry Finn/);
  assert.match(markdown, /## Gaps/);
  assert.match(markdown, /Degree: gap/);
  assert.match(markdown, /## Notes/);
  assert.match(markdown, /Remember the Animori partners/);
  assert.equal(DASH.test(markdown), false);
  const empty = homeReportMarkdown(storyReport(), "   ");
  assert.match(empty, /None yet/);
});
