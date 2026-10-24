import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import {
  IMPORT_LABEL,
  IMPORT_MS,
  MATCH_NOTE,
  conferenceFacts,
  importStageAt,
} from "./home-conference";

const DASH = /[\u2013\u2014]/;

test("conference facts come from the saved catalog", () => {
  const facts = conferenceFacts(getCatalog());
  assert.equal(facts.name, "GitHub Universe 2026");
  assert.equal(facts.dates, "October 28 to 29, 2026");
  assert.match(facts.venue, /Fort Mason Center/);
  assert.equal(facts.speakers, 183);
  assert.equal(facts.sessions, 157);
  assert.equal(facts.topics, 29);
  assert.equal(facts.companies, 88);
  assert.match(facts.scrapeNote, /scraped live from the public conference site/);
  assert.match(facts.matchNote, /saved conference catalog/);
  assert.match(facts.matchNote, /does not scrape the site again/);
  assert.equal(IMPORT_LABEL, "Import conference speakers and people you should meet");
  assert.ok(IMPORT_MS >= 3000 && IMPORT_MS <= 4000);
  assert.equal(DASH.test(`${facts.dates} ${facts.scrapeNote} ${MATCH_NOTE}`), false);
});

test("import stages count with the real totals", () => {
  const counts = { speakers: 183, sessions: 157, topics: 29, shown: 48 };
  assert.equal(importStageAt(0, counts).label, "Reading 0 of 183 speakers");
  assert.equal(importStageAt(0.24, counts).id, "speakers");
  assert.equal(importStageAt(0.2499, counts).label, "Reading 183 speakers");
  assert.match(importStageAt(0.3, counts).label, /sessions/);
  assert.match(importStageAt(0.6, counts).label, /Matching against your story/);
  assert.match(importStageAt(0.8, counts).label, /Ranking by who you can actually talk to/);
  const done = importStageAt(1, counts);
  assert.equal(done.label, "Ranking by who you can actually talk to");
  assert.equal(done.current, 48);
  assert.equal(done.percent, 100);
  assert.equal(importStageAt(Number.NaN, counts).percent, 0);
});
