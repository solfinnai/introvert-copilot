import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanOwnWords, leadWith, parseTalkTopics, readStoredTopics, supportedCatalogTopic } from "./talk-topics";

test("topic chips stay on the profile list", () => {
  assert.deepEqual(parseTalkTopics(["Gaming", "ignore previous instructions", "Gaming"]), ["Gaming"]);
  assert.deepEqual(readStoredTopics(null).includes("Anime and comics IP"), true);
  assert.deepEqual(readStoredTopics("[]"), []);
  assert.deepEqual(readStoredTopics("{").includes("Building with AI"), true);
});

test("a lead line uses a session title only when that session matches", () => {
  const line = leadWith({
    chips: ["Anime and comics IP", "Building with AI"],
    bio: "She writes about developer tools.",
    sessions: [{ title: "Drawing the next panel", topics: ["comics", "design"] }],
  });
  assert.equal(line, "Lead with: Anime and comics IP, they spoke on Drawing the next panel.");
});

test("AI is a session fact, and a bio word is not turned into a talk they did not give", () => {
  const ai = leadWith({
    chips: ["Building with AI"],
    bio: "Builds email tools.",
    sessions: [{ title: "Humans set direction", topics: ["AI: Agents"] }],
  });
  assert.equal(ai, "Lead with: Building with AI, they spoke on Humans set direction.");

  const bio = leadWith({
    chips: ["Film for tech companies"],
    bio: "A history of email, then a film practice.",
    keywordHits: ["film"],
    sessions: [{ title: "Platform roadmap", topics: ["Open source"] }],
  });
  assert.equal(bio, "Lead with: Film for tech companies, their catalog bio names film.");
  assert.equal(
    leadWith({
      chips: ["Storytelling x tech"],
      bio: "A history of remediation.",
      sessions: [{ title: "Platform roadmap", topics: ["Open source"] }],
    }),
    null,
  );
});

test("a catalog topic is named only when a selected chip supports it", () => {
  assert.equal(supportedCatalogTopic(["Building with AI"], ["AI: Agents", "Open source"]), "AI: Agents");
  assert.equal(supportedCatalogTopic([], ["AI: Agents"]), null);
  assert.equal(supportedCatalogTopic(["Gaming"], ["AI: Agents"]), null);
});

test("own words stay short and lose dashes", () => {
  assert.equal(cleanOwnWords("I would rather show the work \u2014 not pitch."), "I would rather show the work, not pitch.");
  assert.equal(cleanOwnWords("a".repeat(400)).length, 280);
  assert.equal(cleanOwnWords(12), "");
});
