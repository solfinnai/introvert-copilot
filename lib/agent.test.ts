import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGENT_MODEL_FALLBACK,
  BUDGET_NOTE,
  LENGTH_MESSAGE,
  MAX_OUTPUT_TOKENS,
  buildOpenAiPayload,
  classifyAgent,
  REVISION_NOTE,
  localCoaching,
  pageBundle,
  personFacts,
  readStreamDelta,
  splitFollowup,
  systemPrompt,
  visibleCoachText,
} from "./agent";
import type { PersonFacts } from "./coach-types";
import { demoUser } from "./demo-user";

test("catalog fallback coaches Henry for a real speaker and never invents an email", () => {
  const person = personFacts("mario-rodriguez");
  assert.ok(person);
  assert.equal(person?.company, "GitHub");
  assert.match(person?.sessions[0]?.title ?? "", /Humans set direction/);
  assert.equal(person?.linkedinUrl, "https://www.linkedin.com/in/mariorodriguez3/");
  assert.equal(person?.email, null);

  const reply = localCoaching("fallback", person, "Give me an opener");
  assert.equal(reply.source, "fallback");
  assert.match(reply.message, /Mario/);
  assert.match(reply.message, /Unicorn Studios/);
  assert.match(reply.message, /1\./);
  assert.match(reply.message, /2\./);
  assert.match(reply.message, /You review and send it yourself/);
  assert.equal(reply.message.includes("\u2014"), false);
  assert.equal(reply.message.includes("\u2013"), false);
  assert.ok(reply.draft);
  assert.equal(/I came to your session/i.test(reply.draft?.body ?? ""), false);
  assert.match(reply.draft?.body ?? "", /on the GitHub Universe schedule/);
  assert.equal(reply.draft?.email, null);
  assert.equal(reply.draft?.linkedinUrl, "https://www.linkedin.com/in/mariorodriguez3/");
  assert.ok((reply.draft?.linkedinNote.length ?? 0) > 0);
  assert.equal(reply.draft?.body.includes("\u2014"), false);
});

test("a missing key or a spent budget stays on the catalog plan", () => {
  const body = { personId: "mario-rodriguez", messages: [{ role: "user", content: "Draft a follow-up" }] };
  const offline = classifyAgent({ body, rateOk: true, hasKey: false, budgetOk: true });
  assert.equal(offline.action, "json");
  if (offline.action === "json") {
    assert.equal(offline.reply.source, "fallback");
    assert.match(offline.reply.message, /catalog/);
    assert.equal(offline.reply.draft?.email, null);
  }
  const capped = classifyAgent({ body, rateOk: true, hasKey: true, budgetOk: false });
  assert.equal(capped.action, "json");
  if (capped.action === "json") {
    assert.equal(capped.reply.source, "budget");
    assert.match(capped.reply.message, new RegExp(BUDGET_NOTE.slice(0, 24)));
  }
  const live = classifyAgent({ body, rateOk: true, hasKey: true, budgetOk: true });
  assert.equal(live.action, "openai");
});

test("catalog coaching refuses to pretend it rewrote a draft", () => {
  const person = personFacts("mario-rodriguez");
  const reply = localCoaching("fallback", person, "Make the draft shorter");
  assert.match(reply.message, new RegExp(REVISION_NOTE.slice(0, 28)));
  const kevin = personFacts("kevin-backhouse");
  assert.equal(kevin?.linkedinUrl, "https://uk.linkedin.com/in/kevinbackhouse");
});

test("guards reject a long message before spending a model call", () => {
  const huge = classifyAgent({
    body: { messages: [{ role: "user", content: "a".repeat(601) }] },
    rateOk: true,
    hasKey: true,
    budgetOk: true,
  });
  assert.equal(huge.action, "json");
  if (huge.action === "json") assert.equal(huge.reply.message, LENGTH_MESSAGE);
  const limited = classifyAgent({
    body: { personId: "mario-rodriguez", messages: [{ role: "user", content: "Hi" }] },
    rateOk: false,
    hasKey: true,
    budgetOk: true,
  });
  assert.equal(limited.action, "json");
  if (limited.action === "json") assert.equal(limited.reply.source, "limit");
});

test("system prompt carries graph facts and the payload stays small", () => {
  const person = personFacts("mario-rodriguez");
  const prompt = systemPrompt(person);
  assert.match(prompt, /inside CUE/);
  assert.equal(prompt.includes("Introvert Co-pilot"), false);
  assert.match(prompt, /Henry Finn/);
  assert.match(prompt, /GitHub/);
  assert.match(prompt, /Humans set direction/);
  assert.match(prompt, /none in the catalog/);
  assert.match(prompt, /CEO since 2023, with the team since 2022/);
  assert.match(prompt, /Degree: GAP/);
  assert.match(prompt, /Anime and comics IP/);
  assert.match(prompt, /VERIFIED STORY/);
  assert.match(prompt, /Fort Mason/);
  assert.match(prompt, /Experience history: gap/);
  assert.equal(prompt.includes("Samsung"), false);
  assert.equal(prompt.includes("\u2014"), false);
  const picked = systemPrompt(person, { topics: ["Gaming"], ownWords: "I would rather show the work." });
  assert.match(picked, /happy to talk about: Gaming/);
  assert.equal(picked.includes("happy to talk about: Anime and comics IP"), false);
  assert.match(picked, /I would rather show the work/);
  assert.equal(prompt.includes("sk-"), false);
  const payload = buildOpenAiPayload({
    person,
    messages: [{ role: "user", content: "Draft a follow-up" }],
  });
  assert.equal(payload.model, AGENT_MODEL_FALLBACK);
  assert.equal(payload.max_tokens, MAX_OUTPUT_TOKENS);
  assert.equal(JSON.stringify(payload).includes("OPENAI_API_KEY"), false);
  const bundle = pageBundle("mario-rodriguez");
  assert.equal(bundle.person?.id, "mario-rodriguez");
  assert.equal(bundle.starter.draft?.linkedinUrl, person?.linkedinUrl);
  assert.ok(bundle.suggestions.some((item) => item.includes("Mario")));
});

test("offline copy keeps the studio separate from a pitch and follows saved topics", () => {
  const person = personFacts("mario-rodriguez");
  assert.ok(person);
  const reply = localCoaching("fallback", person, "Give me an opener");
  const body = reply.draft?.body ?? "";
  assert.equal(/I run Unicorn Studios\. I make anime/.test(body), false);
  assert.equal(/not engineers/i.test(body), false);
  assert.equal(/Goal:/.test(body), false);
  assert.match(body, new RegExp(`${demoUser().name}$`));
  assert.match(reply.message, /Henry Finn runs Unicorn Studios/);
  assert.equal(/runs Unicorn Studios\. I make anime/.test(reply.message), false);

  const quiet = localCoaching("fallback", person, "Give me an opener", { topics: [] });
  for (const named of person.topics) {
    assert.equal(quiet.message.includes(named), false);
    assert.equal((quiet.draft?.body ?? "").includes(named), false);
  }
  assert.equal(/looking for engineers/.test(quiet.message), false);
  assert.match(quiet.message, /have not marked any topics/);

  const creator: PersonFacts = {
    id: "ada",
    name: "Ada Lovelace",
    title: "Artist",
    company: "Studio",
    titleLine: "Artist, Studio",
    photoUrl: "",
    bio: "Draws comics.",
    opener: "",
    why: "",
    catchLine: "",
    topics: ["Design"],
    sharedTopics: [],
    sessions: [],
    pathLine: "",
    linkedinUrl: null,
    email: null,
  };
  const pitched = localCoaching("fallback", creator, "opener", {
    topics: ["Anime and comics IP", "Building with AI"],
  });
  assert.match(pitched.draft?.body ?? "", /anime and comics worlds/i);
  assert.equal(/looking for engineers/i.test(pitched.draft?.body ?? ""), false);
  assert.match(pitched.message, /Henry Finn runs Unicorn Studios/);

  const general = localCoaching("fallback", null, "Draft a follow-up");
  assert.equal(/Goal:/.test(general.draft?.body ?? ""), false);
  assert.match(general.message, /Henry Finn runs Unicorn Studios\./);
  assert.equal(/runs Unicorn Studios\. I make/.test(general.message), false);
});

test("follow-up block becomes a draft and stream deltas stay plain text", () => {
  const person = personFacts("mario-rodriguez");
  const split = splitFollowup(
    "Keep the opener short.\nFOLLOWUP\nSubject: After the main stage\nHi Mario. Thanks for the session. Henry Finn",
    person,
  );
  assert.match(split.message, /opener/);
  assert.equal(split.message.includes("FOLLOWUP"), false);
  assert.equal(split.draft?.subject, "After the main stage");
  assert.equal(split.draft?.email, null);
  assert.equal(split.draft?.linkedinUrl, person?.linkedinUrl);
  assert.equal(readStreamDelta('data: {"choices":[{"delta":{"content":"Hi"}}]}'), "Hi");
  assert.equal(readStreamDelta("data: [DONE]"), null);
  assert.equal(visibleCoachText("Keep it short.\nFOLL"), "Keep it short.");
  assert.equal(visibleCoachText("Keep it short.\nFOLLOWUP\nSubject: Hi"), "Keep it short.");
  assert.equal(visibleCoachText("FOLLOWUP\nSubject: Hi"), "");
});

test("starter prompts use the saved story offline and keep speaker drafts", () => {
  const offline = { rateOk: true, hasKey: false, budgetOk: true };
  const story = classifyAgent({
    body: { messages: [{ role: "user", content: "Talk about my story" }] },
    ...offline,
  });
  assert.equal(story.action, "json");
  if (story.action === "json") {
    assert.match(story.reply.message, /Unicorn Studios|comic book artist|Henry Finn/);
    assert.match(story.reply.message, /gap/i);
    assert.equal(story.reply.draft, null);
    assert.equal(/[\u2013\u2014]/.test(story.reply.message), false);
  }

  const which = classifyAgent({
    body: { messages: [{ role: "user", content: "Talk about a speaker" }] },
    ...offline,
  });
  assert.equal(which.action, "json");
  if (which.action === "json") assert.match(which.reply.message, /Which speaker/);

  const conference = classifyAgent({
    body: { messages: [{ role: "user", content: "Help me understand the conference" }] },
    ...offline,
  });
  assert.equal(conference.action, "json");
  if (conference.action === "json") {
    assert.match(conference.reply.message, /Fort Mason/);
    assert.match(conference.reply.message, /183/);
  }

  const meet = classifyAgent({
    body: { messages: [{ role: "user", content: "Who should I meet first?" }] },
    ...offline,
  });
  assert.equal(meet.action, "json");
  if (meet.action === "json") {
    assert.match(meet.reply.message, /John Maeda|top of the saved ranking/);
    assert.equal(meet.reply.draft, null);
  }

  const generalDraft = classifyAgent({
    body: { messages: [{ role: "user", content: "Draft a follow-up I can copy" }] },
    ...offline,
  });
  assert.equal(generalDraft.action, "json");
  if (generalDraft.action === "json") {
    assert.ok(generalDraft.reply.draft);
    assert.equal(generalDraft.reply.draft?.email, null);
    assert.match(generalDraft.reply.message, /You review and send it yourself/);
  }

  const scoped = classifyAgent({
    body: {
      personId: "mario-rodriguez",
      messages: [{ role: "user", content: "Draft a follow-up I can copy" }],
    },
    ...offline,
  });
  assert.equal(scoped.action, "json");
  if (scoped.action === "json") {
    assert.match(scoped.reply.message, /Mario/);
    assert.equal(scoped.reply.draft?.linkedinUrl, "https://www.linkedin.com/in/mariorodriguez3/");
    assert.match(scoped.reply.draft?.body ?? "", /GitHub Universe/);
  }

  const named = classifyAgent({
    body: { messages: [{ role: "user", content: "Tell me about Mario Rodriguez" }] },
    ...offline,
  });
  assert.equal(named.action, "json");
  if (named.action === "json") assert.match(named.reply.message, /Mario/);
});
