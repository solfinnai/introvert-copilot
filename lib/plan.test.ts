import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlanJson, pathText, templatePlan, type PlanContext } from "./plan";

test("template plan has angles, openers, and a follow-up from the graph path", () => {
  const plan = templatePlan(context());
  assert.equal(plan.mode, "template");
  assert.ok(plan.angles.length >= 2 && plan.angles.length <= 3);
  assert.equal(plan.openers.length, 2);
  assert.ok(plan.followUp.length > 20);
  assert.match(plan.why, /John Maeda/);
  assert.match(plan.why, /graph path/i);
  assert.match(plan.angles.join(" "), /Unicorn Studios/);
  assert.equal(plan.angles.join(" ").includes("Salesforce"), false);
  assert.equal(plan.openers.join(" ").includes("Salesforce"), false);
  const text = `${plan.why} ${plan.angles.join(" ")} ${plan.openers.join(" ")} ${plan.followUp}`;
  assert.equal(text.includes("\u2014"), false);
  assert.equal(text.includes("\u2013"), false);
});

test("path text follows interest, session, and person", () => {
  const text = pathText([
    { kind: "node", text: "You" },
    { kind: "edge", text: "INTERESTED_IN" },
    { kind: "node", text: "AI: Agents" },
    { kind: "edge", text: "ABOUT" },
    { kind: "node", text: "Sketching with code" },
    { kind: "edge", text: "PRESENTS" },
    { kind: "node", text: "John Maeda" },
  ]);
  assert.match(text, /interested in AI: Agents/);
  assert.match(text, /Sketching with code/);
  assert.match(text, /John Maeda/);
});

test("plan parser accepts a full draft and rejects a thin one", () => {
  const parsed = parsePlanJson({
    why: "You share an interest in design, and his session is the reason to walk over and ask one question.",
    angles: [
      "Talk about Unicorn Studios and how a story helps his design work.",
      "Ask what a non engineer should understand about the session.",
    ],
    openers: [
      "I build entertainment companies at Unicorn Studios. Your session is why I came over.",
      "I am Henry, from San Francisco. What should I pay attention to in the session?",
    ],
    follow_up: "Write a note you do not send yet, with one question about the session.",
  });
  assert.equal(parsed?.mode, "openai");
  assert.equal(parsed?.angles.length, 2);
  assert.equal(parsed?.openers.length, 2);
  const dashed = parsePlanJson({
    why: "Walk over \u2014 the session is the reason to spend the energy on this person today.",
    angles: ["Angle one is long enough to keep.", "Angle two is also long enough to keep."],
    openers: ["Opener one is long enough to say.", "Opener two is long enough to say."],
    follow_up: "Write the note later and do not send it yet.",
  });
  assert.ok(dashed);
  assert.equal(dashed?.why.includes("\u2014"), false);
  assert.equal(parsePlanJson({ why: "too short", angles: [], openers: [], follow_up: "" }), null);
});

function context(): PlanContext {
  return {
    name: "John Maeda",
    title: "CVP Engineering",
    company: "Microsoft",
    sessionTitle: "Sketching with code in the age of AI",
    sharedTopics: ["AI: Agents"],
    keywordHits: ["design"],
    pathText: "The graph path is you, interested in AI: Agents, through Sketching with code, to John Maeda.",
    bioLead: "John is a technologist and design leader.",
    introName: "Qianqian Ye",
    henryCompany: "Unicorn Studios",
    henryAbout: "Henry Finn builds entertainment companies and intellectual property.",
    henryCity: "San Francisco",
    henrySite: "https://www.unicornstudios.ai/",
    henryPosts: ["Excited to be producing and hosting for Silicon Valley Insider."],
    henryGoal: "Meet a few builders working on agents.",
    claims: ["Speaker catalog: CVP Engineering, Microsoft."],
  };
}
