import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import { HOME_ENTRIES, HOME_LINE, SPONSORS, formatGraphSize, graphSizeFromHealth, httpsUrl, sampleWhyLines } from "./home";
import { rankPeople } from "./rank";

const DASH = /[\u2013\u2014]/;

test("home line and story stay plain", () => {
  assert.equal(
    HOME_LINE,
    "Walk into every conversation knowing what to say about yourself and what to ask them",
  );
  assert.equal(DASH.test(HOME_LINE), false);
});

test("three entries open who to meet, saved, and the agent", () => {
  assert.deepEqual(
    HOME_ENTRIES.map((entry) => [entry.href, entry.title]),
    [
      ["/meet", "Who to meet"],
      ["/saved", "Saved"],
      ["/agent", "Ask the agent"],
    ],
  );
  for (const entry of HOME_ENTRIES) {
    assert.equal(DASH.test(entry.title + entry.body), false);
    assert.ok(entry.body.length > 10);
  }
});

test("sponsors link out with a role for each", () => {
  assert.deepEqual(
    SPONSORS.map((sponsor) => [sponsor.name, sponsor.role]),
    [
      ["FalkorDB", "graph"],
      ["Bright Data", "live intel"],
      ["TrueFoundry", "agent tools"],
      ["Qodo", "code review"],
      ["OpenAI", "agent chat"],
    ],
  );
  const hosts = SPONSORS.map((sponsor) => new URL(sponsor.href).host);
  assert.deepEqual(hosts, [
    "www.falkordb.com",
    "brightdata.com",
    "www.truefoundry.com",
    "www.qodo.ai",
    "openai.com",
  ]);
  for (const sponsor of SPONSORS) {
    assert.equal(sponsor.href.startsWith("https://"), true);
    assert.equal(DASH.test(sponsor.name + sponsor.role), false);
  }
});

test("graph size comes from a successful health payload", () => {
  assert.equal(formatGraphSize(1204, 3401), "1,204 nodes, 3,401 edges");
  assert.equal(formatGraphSize(1, 1), "1 node, 1 edge");
  assert.equal(formatGraphSize(0, 0), "0 nodes, 0 edges");
  assert.equal(formatGraphSize(-1, 4), null);
  assert.equal(formatGraphSize(Number.NaN, 4), null);
  assert.equal(
    graphSizeFromHealth({ ok: true, backend: "falkordb", nodes: 12, edges: 40 }),
    "12 nodes, 40 edges",
  );
  assert.equal(graphSizeFromHealth({ ok: false, backend: "memory", nodes: 0, edges: 0 }), null);
  assert.equal(graphSizeFromHealth({ ok: true, nodes: "12", edges: 3 }), null);
  assert.equal(graphSizeFromHealth(null), null);
  assert.equal(graphSizeFromHealth([]), null);
  assert.equal(httpsUrl("https://www.linkedin.com/in/henryfinnco/"), "https://www.linkedin.com/in/henryfinnco/");
  assert.equal(httpsUrl("http://example.com"), null);
  assert.equal(httpsUrl("javascript:alert(1)"), null);
});

test("sample why lines are the first three real ranking reasons", () => {
  const catalog = getCatalog();
  const ranked = rankPeople(catalog, null, { day: "both", metIds: [], limit: 10 });
  const sample = sampleWhyLines(ranked);
  assert.equal(sample.length, 3);
  assert.deepEqual(
    sample.map((person) => person.id),
    ranked.slice(0, 3).map((person) => person.id),
  );
  for (const person of sample) {
    assert.equal(person.why.length > 40, true);
    assert.equal(DASH.test(person.why), false);
  }
  const skipped = sampleWhyLines([
    { id: "a", name: "A", why: "   " },
    { id: "b", name: "B", why: "Shared topic." },
    { id: "b", name: "B again", why: "Duplicate." },
    { id: "c", name: "C", why: "Second reason." },
  ]);
  assert.deepEqual(
    skipped.map((person) => person.id),
    ["b", "c"],
  );
});
