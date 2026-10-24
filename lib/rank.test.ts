import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalog, memoryGraphCounts } from "./catalog";
import { rankPeople } from "./rank";
import { wholeWordHits } from "./terms";
import { sanitizeCopy } from "./sanitize";

test("whole words do not match inside other words", () => {
  const hits = wholeWordHits("start history designed remediation email storytelling video");
  assert.deepEqual(hits, ["video", "storytelling"]);
  assert.ok(wholeWordHits("I design comics and anime films with AI").includes("design"));
  assert.ok(wholeWordHits("I design comics and anime films with AI").includes("ai"));
  assert.equal(wholeWordHits("CoreAI and multimedia").length, 0);
});

test("catalog has the published speaker and session counts", () => {
  const catalog = getCatalog();
  assert.equal(catalog.people.length, 183);
  assert.equal(catalog.sessions.length, 157);
  assert.equal(catalog.speakerCount, 183);
  assert.equal(catalog.sessionCount, 157);
  const counts = memoryGraphCounts(catalog);
  assert.ok(counts.nodes > 300);
  assert.ok(counts.edges > 400);
});

test("who to meet ranks a multi-hop path and keeps Maeda near the top", () => {
  const catalog = getCatalog();
  const people = rankPeople(catalog, null, { day: "both", metIds: [], limit: 10 });
  assert.equal(people.length, 10);
  const summary = people
    .map((person) => `${person.score} ${person.name} [${person.keywordHits.join("+")}] via ${person.introVia?.name ?? "-"}`)
    .join(" | ");
  const maeda = people.find((person) => person.id === "john-maeda");
  assert.ok(maeda, summary);
  assert.ok(people.findIndex((person) => person.id === "john-maeda") < 3, summary);
  assert.equal(maeda?.introVia?.id, "qianqian-ye");
  assert.equal(maeda?.hops, 3);
  assert.ok(maeda?.path.some((chip) => chip.text === "INTERESTED_IN"));
  assert.ok(maeda?.path.some((chip) => chip.text === "ABOUT"));
  assert.ok(maeda?.path.some((chip) => chip.text === "PRESENTS"));
  assert.equal(maeda?.dayKey, "thu");
  for (const person of people) {
    assert.equal(/[\u2013\u2014]/.test(person.why), false, person.why);
    assert.equal(/[\u2013\u2014]/.test(person.opener), false, person.opener);
  }
});

test("a selected day requires a session that day, even for a keyword hit", () => {
  const catalog = getCatalog();
  const maeda = catalog.peopleById.get("john-maeda");
  assert.ok(maeda);
  const days = new Set(
    maeda.sessionIds.map((id) => catalog.sessionsById.get(id)?.dayKey).filter((day) => day && day !== "other"),
  );
  assert.deepEqual([...days], ["thu"]);
  const wednesday = rankPeople(catalog, null, { day: "wed", metIds: [], limit: 183 });
  assert.equal(
    wednesday.some((person) => person.id === "john-maeda"),
    false,
  );
  for (const person of wednesday) assert.equal(person.dayKey, "wed");
  const thursday = rankPeople(catalog, null, { day: "thu", metIds: [], limit: 183 });
  assert.ok(thursday.some((person) => person.id === "john-maeda"));
  for (const person of thursday) assert.equal(person.dayKey, "thu");
});

test("met people drop out and Thursday keeps Maeda", () => {
  const catalog = getCatalog();
  const without = rankPeople(catalog, null, { day: "both", metIds: ["john-maeda"], limit: 10 });
  assert.equal(without.some((person) => person.id === "john-maeda"), false);
  const thursday = rankPeople(catalog, null, { day: "thu", metIds: [], limit: 10 });
  assert.ok(thursday.some((person) => person.id === "john-maeda"));
  const wednesday = rankPeople(catalog, null, { day: "wed", metIds: [], limit: 10 });
  assert.equal(wednesday.some((person) => person.id === "john-maeda"), false);
});

test("sanitize turns dashes into punctuation we can show", () => {
  assert.equal(sanitizeCopy("games \u2014 a background"), "games, a background");
  assert.equal(sanitizeCopy("from 2021 \u2013 2025"), "from 2021 to 2025");
});
