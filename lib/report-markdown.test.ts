import assert from "node:assert/strict";
import { test } from "node:test";
import type { PersonIntel } from "./intel";
import type { ConversationPlan } from "./plan";
import { buildReportMarkdown } from "./report-markdown";

const DASH = /[\u2013\u2014]/;

test("the markdown report keeps sections, gaps, and drops dashes", () => {
  const plan: ConversationPlan = {
    mode: "template",
    why: "You share agents.",
    angles: ["Say one sentence about your studio."],
    openers: [],
    followUp: "Offer to send a note later.",
  };
  const intel = snapshotIntel();
  const markdown = buildReportMarkdown({
    name: "Ada Lovelace",
    titleLine: "Engineer, Example",
    catchLine: "Main Stage, Wed 1:30 PM",
    sessions: [{ title: "Agents live", line: "Wednesday, Oct 28, 1:30 PM, Main Stage @ Festival Pavilion" }],
    plan,
    intel,
    report: {
      serp: "skipped",
      unlock: "skipped",
      linkedin: "failed",
      plan: "template",
      serpReason: "not configured",
      unlockReason: "not requested",
      linkedinReason: "no public url",
    },
    links: [{ title: "Talk", url: "https://example.com/talk", domain: "example.com", group: "articles", origin: "snapshot", fetchedAt: "2026-10-24T18:00:00.000Z" }],
  });
  assert.match(markdown, /^# Ada Lovelace/m);
  assert.match(markdown, /## Sessions/);
  assert.match(markdown, /Main Stage @ Festival Pavilion/);
  assert.match(markdown, /## Conversation plan/);
  assert.match(markdown, /Not listed in the sources we have\./);
  assert.match(markdown, /LinkedIn returned no experience entries\./);
  assert.match(markdown, /Nothing public in this section\./);
  assert.match(markdown, /Spoke about agents, live/);
  assert.match(markdown, /https:\/\/example.com\/talk/);
  assert.match(markdown, /Nothing is sent/);
  assert.equal(DASH.test(markdown), false);
  assert.doesNotMatch(markdown, /javascript:/);
});

function snapshotIntel(): PersonIntel {
  return {
    mode: "snapshot",
    label: "Cached snapshot",
    fetchedAt: "2026-10-24T18:00:00.000Z",
    work: [],
    education: [],
    workGap: "LinkedIn returned no experience entries.",
    educationGap: null,
    workGapOrigin: "snapshot",
    educationGapOrigin: null,
    personality: {
      summary: "A public communication read.",
      communication: "Short questions land better.",
      confidence: "low",
      sourceUrl: "https://example.com/a",
      sourceLabel: "Catalog",
      fetchedAt: "2026-10-24T18:00:00.000Z",
      origin: "snapshot",
      label: "Inference from public sources. Not a diagnosis.",
    },
    psychographics: [],
    news: [
      {
        text: "Spoke about agents \u2014 live",
        sourceUrl: "https://example.com/news",
        sourceLabel: "News",
        fetchedAt: "2026-10-24T18:00:00.000Z",
        confidence: "medium",
        inference: false,
        origin: "snapshot",
      },
    ],
    newsNote: null,
    standout: [],
    talkingPoints: [],
    sources: [],
  };
}
