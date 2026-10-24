import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { test } from "node:test";
import { DEMO_USER_REL, blurbFromProfile, loadDemoCard, oneLineStory } from "./demo-user";

const DASH = /[\u2013\u2014]/;
const ABOUT =
  "Henry grew up wanting to be a comic book artist and never really stopped telling stories. He studied cinema at SFSU.";
const CHIPS = ["Storytelling x tech", "Anime and comics IP", "Building with AI"];

test("one line story uses the about sentence and two topic chips", () => {
  const story = oneLineStory(ABOUT, CHIPS);
  assert.equal(
    story,
    "Henry grew up wanting to be a comic book artist and never really stopped telling stories, including Storytelling x tech and Anime and comics IP.",
  );
  assert.equal(DASH.test(story), false);
  assert.equal(oneLineStory("", []), "");
  assert.equal(oneLineStory("", ["Gaming"]), "Gaming.");
  assert.equal(oneLineStory("Just the about.", []), "Just the about.");
});

test("profile blurb keeps name, headline, and an https linkedin link", () => {
  const blurb = blurbFromProfile({
    name: "Henry Finn",
    headline: "Founder at Unicorn Studios",
    about: ABOUT,
    topic_chips: CHIPS,
    linkedin_url: "https://www.linkedin.com/in/henryfinnco/",
  });
  assert.equal(blurb?.name, "Henry Finn");
  assert.equal(blurb?.headline, "Founder at Unicorn Studios");
  assert.equal(blurb?.linkedin, "https://www.linkedin.com/in/henryfinnco/");
  assert.equal(blurbFromProfile({ headline: "No name" }), null);
  assert.equal(blurbFromProfile(null), null);
});

test("canonical demo-user file wins when it is present", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-user-"));
  const full = path.join(root, DEMO_USER_REL);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(
    full,
    JSON.stringify({
      name: "Ada Lovelace",
      headline: "Writer",
      about: "Ada writes careful notes.",
      topic_chips: ["Graphs"],
      linkedin_url: "http://example.com",
    }),
  );
  const card = loadDemoCard(root);
  assert.equal(card.name, "Ada Lovelace");
  assert.equal(card.headline, "Writer");
  assert.match(card.story, /Ada writes careful notes, including Graphs/);
  assert.equal(card.linkedin, null);
  assert.equal(card.photo, null);
});

test("missing file uses the attached Henry profile", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-user-empty-"));
  const card = loadDemoCard(root);
  assert.equal(card.name, "Henry Finn");
  assert.equal(
    card.headline,
    "Founder at the intersection of story and technology | Unicorn Studios, Animori, Metacomica, 0N1 Force",
  );
  assert.equal(
    card.story,
    "Henry grew up wanting to be a comic book artist and never really stopped telling stories, including Storytelling x tech and Anime and comics IP.",
  );
  assert.equal(card.linkedin, "https://www.linkedin.com/in/henryfinnco/");
  assert.equal(card.photo, null);
  assert.equal(DASH.test(`${card.headline} ${card.story}`), false);
});

test("a broken demo-user file falls back instead of throwing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-user-bad-"));
  const full = path.join(root, DEMO_USER_REL);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, "{not json");
  assert.equal(loadDemoCard(root).name, "Henry Finn");
});

test("checkout photo is used when public/henry.jpg exists", () => {
  const card = loadDemoCard();
  const henry = path.join(process.cwd(), "public", "henry.jpg");
  if (fs.existsSync(henry)) assert.equal(card.photo, "/henry.jpg");
  else assert.equal(card.photo, null);
  assert.equal(card.name, "Henry Finn");
  assert.equal(DASH.test(card.story), false);
});
