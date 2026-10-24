import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import {
  HOME_RANK_LIMIT,
  firstSentence,
  groupHomeMatches,
  shownCount,
  splitHomeMatches,
} from "./home-matches";
import { rankPeople } from "./rank";

test("home import keeps the top of the real ranking, then the next rows", () => {
  const ranked = rankPeople(getCatalog(), null, { day: "both", metIds: [], limit: HOME_RANK_LIMIT });
  assert.equal(ranked.length, HOME_RANK_LIMIT);
  const parts = splitHomeMatches(ranked);
  assert.equal(parts.top.length, 6);
  assert.equal(parts.strong.length, 12);
  assert.equal(parts.also.length, 30);
  assert.equal(shownCount(ranked), 48);
  assert.equal(parts.top[0]?.name, ranked[0]?.name);
  assert.equal(parts.strong[0]?.id, ranked[6]?.id);
  assert.equal(parts.also[0]?.id, ranked[18]?.id);
  const groups = groupHomeMatches(
    parts.also.map((person) => ({
      sharedTopics: person.sharedTopics,
      company: person.company,
      id: person.id,
    })),
  );
  const flat = groups.flatMap((group) => group.people.map((person) => person.id));
  assert.deepEqual([...flat].sort(), parts.also.map((person) => person.id).sort());
  assert.ok(groups.every((group) => group.theme.trim().length > 0 && group.people.length > 0));
  assert.equal(firstSentence("You share AI. The rest stays."), "You share AI.");
  assert.equal(firstSentence(""), "");
});
