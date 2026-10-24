import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { LINKEDIN_TIMEOUT_MS, SERP_TIMEOUT_MS, SITE_TIMEOUT_MS, searchGoogle, unlockPage } from "./brightdata";
import { getCatalog } from "./catalog";
import { INTEL_CACHE_CONTROL, INTEL_CACHE_TTL_MS, intelCacheControl, isStoredBrief, type CachedBrief } from "./intel-cache";
import { buildSnapshotIntel, isBlockedPublicUrl, type SnapshotInput } from "./intel";
import { collectLive, seedPageUrls } from "./live-brief";
import { LIVE_LABELS } from "./live-labels";
import { buildSeedBrief } from "./person-brief";
import { templatePlan, type PlanContext } from "./plan";
import { personCard } from "./rank";
import { sessionsForPerson } from "./speakers";
import { topSpeakers, WARM_LIMIT } from "./warm";

test("live calls use short per-call timeouts and the brief cache lasts 6 hours", () => {
  assert.equal(SERP_TIMEOUT_MS, 8_000);
  assert.equal(SITE_TIMEOUT_MS, 8_000);
  assert.equal(LINKEDIN_TIMEOUT_MS, 12_000);
  assert.equal(INTEL_CACHE_TTL_MS, 6 * 60 * 60 * 1000);
  assert.match(INTEL_CACHE_CONTROL, /max-age=21600/);
  assert.equal(INTEL_CACHE_CONTROL.includes("stale-while-revalidate"), false);
  const aged = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  const header = intelCacheControl(aged);
  const maxAge = Number(header.match(/max-age=(\d+)/)?.[1]);
  assert.ok(maxAge <= 3600 && maxAge >= 3590);
  assert.equal(LIVE_LABELS.news, "Finding recent news...");
});

test("private and non-http urls are not fetched", () => {
  assert.equal(isBlockedPublicUrl("http://127.0.0.1/latest"), true);
  assert.equal(isBlockedPublicUrl("http://[::1]/secret"), true);
  assert.equal(isBlockedPublicUrl("http://[fd00::1]/secret"), true);
  assert.equal(isBlockedPublicUrl("http://100.64.1.1/meta"), true);
  assert.equal(isBlockedPublicUrl("http://metadata.internal/secret"), true);
  assert.equal(isBlockedPublicUrl("http://169.254.169.254/"), true);
  assert.equal(isBlockedPublicUrl("http://10.0.0.5/admin"), true);
  assert.equal(isBlockedPublicUrl("http://localhost/secret"), true);
  assert.equal(isBlockedPublicUrl("file:///etc/passwd"), true);
  assert.equal(isBlockedPublicUrl("https://johnmaeda.medium.com/design-in-tech"), false);
});

test("seed page urls skip the catalog, LinkedIn, and private hosts", () => {
  const urls = seedPageUrls(sampleInput());
  assert.deepEqual(urls, ["https://johnmaeda.medium.com/design-in-tech"]);
});

test("John Maeda seed brief renders without a live fetch", () => {
  const catalog = getCatalog();
  const card = personCard(catalog, "john-maeda", null, { day: "both", metIds: [], limit: 1 });
  assert.ok(card);
  const brief = buildSeedBrief(card);
  assert.equal(brief.intel.mode, "snapshot");
  assert.equal(brief.intel.label, "Cached snapshot");
  assert.equal(brief.plan.mode, "template");
  assert.match(brief.plan.why, /John Maeda/);
  assert.ok(brief.plan.angles.length >= 2);
  assert.ok(sessionsForPerson(catalog, "john-maeda").length >= 1);
  assert.ok(brief.links.length + brief.profiles.length > 0);
});

test("serp, site, and LinkedIn start together", async () => {
  const starts: string[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pending = collectLive({
    input: sampleInput(),
    snapshot: buildSnapshotIntel(sampleInput()),
    planContext: planContext(),
    twitterHandle: null,
    timeouts: { serp: 500, site: 500, linkedin: 500 },
    deps: {
      searchGoogle: async () => {
        starts.push("serp");
        await gate;
        return { ok: false, reason: "timed out" };
      },
      unlockPage: async () => {
        starts.push("site");
        await gate;
        return { ok: false, reason: "timed out" };
      },
      scrapeLinkedIn: async () => {
        starts.push("linkedin");
        await gate;
        return { ok: false, reason: "timed out" };
      },
      draftPlan: async (ctx) => templatePlan(ctx),
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(starts.includes("serp"));
  assert.ok(starts.includes("site"));
  assert.ok(starts.includes("linkedin"));
  release();
  const result = await pending;
  assert.equal(result.plan.mode, "template");
});

test("a stalled live fetch keeps the cached snapshot", async () => {
  const snapshot = buildSnapshotIntel(sampleInput());
  const updates: string[] = [];
  const result = await collectLive({
    input: sampleInput(),
    snapshot,
    planContext: planContext(),
    twitterHandle: null,
    timeouts: { serp: 30, site: 30, linkedin: 40 },
    deps: {
      searchGoogle: () => new Promise(() => undefined),
      unlockPage: () => new Promise(() => undefined),
      scrapeLinkedIn: () => new Promise(() => undefined),
      draftPlan: async (ctx) => templatePlan(ctx),
    },
    onUpdate: (update) => updates.push(`${update.section}:${update.status}`),
  });
  assert.equal(result.intel.mode, "snapshot");
  assert.equal(result.intel.label, "Cached snapshot");
  assert.equal(result.report.serpReason, "timed out");
  assert.equal(result.report.unlockReason, "timed out");
  assert.equal(result.report.linkedinReason, "timed out");
  assert.equal(result.plan.mode, "template");
  assert.ok(updates.includes("news:timeout"));
  assert.ok(updates.includes("site:timeout"));
  assert.ok(updates.includes("linkedin:timeout"));
  assert.ok(result.intel.news.some((claim) => /Design in Tech/.test(claim.text)));
});

test("a finished search is kept when another search stalls", async () => {
  const snapshot = buildSnapshotIntel(sampleInput());
  let calls = 0;
  const body = JSON.stringify({
    organic: [
      {
        link: "https://www.wired.com/story/maeda",
        title: "John Maeda profile",
        description: "John Maeda on design and AI",
      },
    ],
  });
  const result = await collectLive({
    input: sampleInput(),
    snapshot,
    planContext: planContext(),
    twitterHandle: null,
    timeouts: { serp: 40, site: 40, linkedin: 40 },
    deps: {
      searchGoogle: () => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve({
            ok: true as const,
            body,
            url: "https://www.google.com/search",
            fetchedAt: "2026-10-24T00:00:00.000Z",
          });
        }
        return new Promise(() => undefined);
      },
      unlockPage: () => Promise.resolve({ ok: false as const, reason: "not configured" }),
      scrapeLinkedIn: () => Promise.resolve({ ok: false as const, reason: "not configured" }),
      draftPlan: async (ctx) => templatePlan(ctx),
    },
  });
  assert.equal(result.report.serp, "live");
  assert.ok(result.hits.some((hit) => hit.url.includes("wired.com")));
});

test("a finished page is kept when another page stalls", async () => {
  const input = sampleInput();
  input.sources = [
    { url: "https://johnmaeda.medium.com/one", title: "One" },
    { url: "https://maeda.example.com/about", title: "About" },
  ];
  const snapshot = buildSnapshotIntel(input);
  const page = `<html><head><title>Design in Tech</title></head><body><p>${"John Maeda writes about design and artificial intelligence. ".repeat(8)}</p></body></html>`;
  const result = await collectLive({
    input,
    snapshot,
    planContext: planContext(),
    twitterHandle: null,
    timeouts: { serp: 30, site: 80, linkedin: 30 },
    deps: {
      searchGoogle: () => Promise.resolve({ ok: false as const, reason: "not configured" }),
      unlockPage: (url) => {
        if (url.includes("medium.com")) {
          return Promise.resolve({
            ok: true as const,
            body: page,
            url,
            fetchedAt: "2026-10-24T00:00:00.000Z",
          });
        }
        return new Promise(() => undefined);
      },
      scrapeLinkedIn: () => Promise.resolve({ ok: false as const, reason: "not configured" }),
      draftPlan: async (ctx) => templatePlan(ctx),
    },
  });
  assert.equal(result.report.unlock, "live");
  assert.ok(result.pages.some((item) => item.url.includes("medium.com")));
});

test("a timeout snapshot is worth caching and a skipped one is not", () => {
  assert.equal(isStoredBrief(sampleCache("failed", "timed out")), true);
  assert.equal(isStoredBrief(sampleCache("failed", "http 429")), true);
  assert.equal(isStoredBrief(sampleCache("skipped", "not requested")), false);
  assert.equal(isStoredBrief(sampleCache("failed", "not configured")), false);
});

test("warm list is the top 15 to 20 speakers", () => {
  const people = topSpeakers(WARM_LIMIT);
  assert.ok(people.length >= 15 && people.length <= 20);
  assert.equal(people[0]?.id, "john-maeda");
  const scores = people.map((person) => person.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test("the person page paints the seed brief and does not wait on live intel", () => {
  const root = process.cwd();
  const page = fs.readFileSync(path.join(root, "app/people/[id]/page.tsx"), "utf8");
  const live = fs.readFileSync(path.join(root, "components/PersonLive.tsx"), "utf8");
  const route = fs.readFileSync(path.join(root, "app/api/people/[id]/live/route.ts"), "utf8");
  assert.equal(page.includes("loadPersonBrief"), false);
  assert.equal(page.includes("describePerson"), false);
  assert.match(page, /buildSeedBrief/);
  assert.match(page, /sessionsForPerson/);
  assert.match(live, /Finding recent news\.\.\.|LIVE_LABELS/);
  assert.match(live, /\/api\/people\//);
  const rateAt = route.indexOf("rateLimit");
  const watchAt = route.indexOf("watchPersonBrief");
  assert.ok(rateAt > -1 && watchAt > rateAt);
});

test("search and site fetches abort at their own timeout", async () => {
  const previousKey = process.env.BRIGHTDATA_API_KEY;
  const previousZone = process.env.BRIGHTDATA_SERP_ZONE;
  const previousUnlock = process.env.BRIGHTDATA_UNLOCKER_ZONE;
  const previousFetch = globalThis.fetch;
  process.env.BRIGHTDATA_API_KEY = "test-key";
  process.env.BRIGHTDATA_SERP_ZONE = "serp";
  process.env.BRIGHTDATA_UNLOCKER_ZONE = "unlock";
  globalThis.fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort);
    });
  try {
    const started = Date.now();
    const [serp, site] = await Promise.all([searchGoogle("John Maeda", 40), unlockPage("https://example.com/john", 40)]);
    assert.equal(serp.ok, false);
    assert.equal(site.ok, false);
    if (!serp.ok) assert.equal(serp.reason, "timed out");
    if (!site.ok) assert.equal(site.reason, "timed out");
    assert.ok(Date.now() - started < 1000);
  } finally {
    globalThis.fetch = previousFetch;
    restore("BRIGHTDATA_API_KEY", previousKey);
    restore("BRIGHTDATA_SERP_ZONE", previousZone);
    restore("BRIGHTDATA_UNLOCKER_ZONE", previousUnlock);
  }
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function sampleInput(): SnapshotInput {
  return {
    name: "John Maeda",
    title: "VP of Design and Artificial Intelligence",
    company: "Microsoft",
    bio: "John Maeda studied at the MIT Media Lab and the Rhode Island School of Design.",
    sessionTitle: "Sketching with code",
    sessionAbstract: "A public session about design and AI.",
    topics: ["AI: Agents"],
    sources: [
      { url: "https://githubuniverse.com/speakers", title: "Catalog" },
      { url: "https://www.linkedin.com/in/johnmaeda", title: "LinkedIn" },
      { url: "http://127.0.0.1/latest", title: "Local" },
      { url: "https://johnmaeda.medium.com/design-in-tech", title: "Design in Tech", date: "2019" },
    ],
    catalogUrl: "https://githubuniverse.com/speakers",
    fetchedAt: "2026-10-01T00:00:00.000Z",
    linkedinUrl: "https://www.linkedin.com/in/johnmaeda",
  };
}

function planContext(): PlanContext {
  return {
    name: "John Maeda",
    title: "VP",
    company: "Microsoft",
    sessionTitle: "Sketching with code",
    sharedTopics: ["AI: Agents"],
    keywordHits: ["design"],
    pathText: "The graph path is you, interested in AI: Agents, to John Maeda.",
    bioLead: "John Maeda studied at the MIT Media Lab.",
    introName: null,
    henryCompany: "Unicorn Studios",
    henryAbout: "Henry Finn builds entertainment companies and intellectual property.",
    henryCity: "San Francisco",
    henrySite: "https://www.unicornstudios.ai/",
    henryPosts: [],
    henryGoal: "Meet people building in public.",
    henryTalkingPoints: [],
    claims: [],
  };
}

function sampleCache(state: "failed" | "skipped", reason: string): CachedBrief {
  const snapshot = buildSnapshotIntel(sampleInput());
  return {
    version: 5,
    savedAt: new Date().toISOString(),
    intel: snapshot,
    plan: templatePlan(planContext()),
    report: {
      serp: state,
      unlock: state,
      linkedin: state,
      plan: "template",
      serpReason: reason,
      unlockReason: reason,
      linkedinReason: reason,
    },
    profiles: [],
    links: [],
  };
}
