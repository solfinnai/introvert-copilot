import assert from "node:assert/strict";
import { test } from "node:test";
import { henryPublic } from "./henry-profile";

test("Henry's public snapshot keeps the live profile and the history gaps", () => {
  const henry = henryPublic();
  assert.equal(henry.name, "Henry Finn");
  assert.equal(henry.company, "Unicorn Studios");
  assert.match(henry.companyUrl, /unicornstudios\.ai/);
  assert.match(henry.avatar, /^https:\/\//);
  assert.equal(henry.followers, 106);
  assert.equal(henry.experienceGap, true);
  assert.equal(henry.educationGap, true);
  assert.match(henry.about, /intellectual property/);
  assert.ok(henry.talkingPoints.some((point) => point.source === "linkedin" && /Unicorn Studios/.test(point.text)));
  assert.ok(henry.talkingPoints.some((point) => point.source === "confirmed" && /BLACKPINK/.test(point.text)));
  assert.ok(henry.talkingPoints.some((point) => point.source === "confirmed" && /Animori/.test(point.text)));
  assert.ok(henry.talkingPoints.some((point) => point.source === "confirmed" && /Metacomica/.test(point.text)));
  assert.ok(henry.posts.length >= 2);
  assert.ok(henry.posts.every((post) => /henryfinnco_/i.test(post.url)));
  assert.equal(JSON.stringify(henry.posts).includes("Salesforce"), false);
  const text = `${henry.about} ${henry.posts.map((post) => post.title).join(" ")}`;
  assert.equal(text.includes("\u2014"), false);
  assert.equal(text.includes("\u2013"), false);
});
