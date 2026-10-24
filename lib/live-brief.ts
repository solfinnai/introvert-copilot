import {
  LINKEDIN_TIMEOUT_MS,
  SERP_TIMEOUT_MS,
  SITE_TIMEOUT_MS,
  scrapeLinkedIn,
  searchGoogle,
  unlockPage,
  type LiveResult,
} from "./brightdata";
import {
  applyLiveSources,
  isBlockedPublicUrl,
  normalizeLinkedIn,
  parseLinkedInPayload,
  parsePage,
  parseSerp,
  pickUnlockTargets,
  type FetchReport,
  type FetchState,
  type LinkedInProfile,
  type LivePieces,
  type PersonIntel,
  type SerpHit,
  type SnapshotInput,
  type UnlockedPage,
} from "./intel";
import type { LiveUpdate } from "./live-update";
import { draftPlan, templatePlan, type ConversationPlan, type PlanContext } from "./plan";
import {
  buildPublicBundle,
  pickPagesToOpen,
  textMentionsPerson,
  type MinedPage,
  type PublicHit,
  type PublicLink,
  type SocialProfile,
} from "./public-links";

const PAGE_CAP = 2;

export interface LiveDeps {
  searchGoogle: (query: string, timeoutMs: number) => Promise<LiveResult>;
  unlockPage: (url: string, timeoutMs: number) => Promise<LiveResult>;
  scrapeLinkedIn: (url: string, timeoutMs: number) => Promise<LiveResult>;
  draftPlan: (ctx: PlanContext) => Promise<ConversationPlan>;
}

export interface CollectInput {
  input: SnapshotInput;
  snapshot: PersonIntel;
  planContext: PlanContext;
  twitterHandle: string | null;
  deps?: LiveDeps;
  timeouts?: { serp?: number; site?: number; linkedin?: number };
  onUpdate?: (update: LiveUpdate) => void;
  planContextFor?: (intel: PersonIntel) => PlanContext;
}

export interface CollectedBrief {
  intel: PersonIntel;
  plan: ConversationPlan;
  report: FetchReport;
  hits: PublicHit[];
  pages: MinedPage[];
  liveFetchedAt: string | null;
  profiles: SocialProfile[];
  links: PublicLink[];
}

export function defaultLiveDeps(): LiveDeps {
  return {
    searchGoogle: (query, timeoutMs) => searchGoogle(query, timeoutMs),
    unlockPage: (url, timeoutMs) => unlockPage(url, timeoutMs),
    scrapeLinkedIn: (url, timeoutMs) => scrapeLinkedIn(url, timeoutMs),
    draftPlan: (ctx) => draftPlan(ctx),
  };
}

export function seedPageUrls(input: SnapshotInput): string[] {
  const urls: string[] = [];
  for (const source of input.sources) {
    if (!source.url || source.url === "GAP") continue;
    if (input.catalogUrl && source.url === input.catalogUrl) continue;
    if (/githubuniverse\.com/i.test(source.url)) continue;
    if (isBlockedPublicUrl(source.url)) continue;
    urls.push(source.url.split("#")[0]);
  }
  return unique(urls);
}

export async function collectLive(args: CollectInput): Promise<CollectedBrief> {
  const deps = args.deps ?? defaultLiveDeps();
  const serpMs = positive(args.timeouts?.serp, SERP_TIMEOUT_MS);
  const siteMs = positive(args.timeouts?.site, SITE_TIMEOUT_MS);
  const linkedinMs = positive(args.timeouts?.linkedin, LINKEDIN_TIMEOUT_MS);
  const input = args.input;
  const fetchedAt = new Date().toISOString();
  const linkedinUrl = normalizeLinkedIn(input.linkedinUrl);

  let serpHits: SerpHit[] = [];
  let publicHits: PublicHit[] = [];
  let pages: UnlockedPage[] = [];
  let mined: MinedPage[] = [];
  let profile: LinkedInProfile | null = null;
  let report: FetchReport = {
    serp: "skipped",
    unlock: "skipped",
    linkedin: linkedinUrl ? "skipped" : "skipped",
    plan: "template",
    serpReason: "not requested",
    unlockReason: "not requested",
    linkedinReason: linkedinUrl ? "not requested" : "no public url",
  };
  let plan = templatePlan(args.planContext);

  const queries = readingQueries(input.name, input.company);
  const serpPromise = Promise.all(
    queries.map((query) =>
      withDeadline(callLive(() => deps.searchGoogle(query, serpMs)), serpMs, {
        ok: false as const,
        reason: "timed out",
      }),
    ),
  );
  const linkedinPromise = linkedinUrl
    ? withDeadline(
        callLive(() => deps.scrapeLinkedIn(linkedinUrl, linkedinMs)),
        linkedinMs,
        { ok: false as const, reason: "timed out" },
      )
    : Promise.resolve({ ok: false as const, reason: "no public url" });
  const sitePromise = loadSites(input, serpPromise, deps, siteMs);
  const planPromise = deps.draftPlan(args.planContext).catch(() => templatePlan(args.planContext));

  function foundSomething(): boolean {
    return publicHits.length > 0 || mined.length > 0 || Boolean(profile) || serpHits.length > 0;
  }

  function intelNow(): PersonIntel {
    const live: LivePieces = { fetchedAt, linkedin: profile, serp: serpHits, pages };
    if (!profile && serpHits.length === 0 && pages.length === 0) return args.snapshot;
    return applyLiveSources(args.snapshot, live, input);
  }

  function bundleNow() {
    return buildPublicBundle({
      name: input.name,
      company: input.company,
      linkedinUrl: input.linkedinUrl,
      twitterHandle: args.twitterHandle,
      sources: input.sources,
      snapshotFetchedAt: input.fetchedAt,
      hits: publicHits,
      pages: mined,
      liveFetchedAt: foundSomething() ? fetchedAt : null,
    });
  }

  function emit(section: LiveUpdate["section"], status: LiveUpdate["status"], nextPlan?: ConversationPlan): void {
    if (nextPlan) plan = nextPlan;
    report = { ...report, plan: plan.mode };
    const bundle = bundleNow();
    args.onUpdate?.({
      section,
      status,
      intel: section === "plan" ? undefined : intelNow(),
      plan: section === "plan" ? plan : undefined,
      report: { ...report },
      links: bundle.links,
      profiles: bundle.profiles,
    });
  }

  const serpDone = serpPromise.then((results) => {
    const parsed = parseSerpBatch(results);
    serpHits = parsed.intelHits;
    publicHits = parsed.publicHits;
    const serp = combineSerp(results, publicHits.length > 0 || serpHits.length > 0);
    report = { ...report, serp: serp.state, serpReason: serp.reason };
    emit("news", statusOf(serp.state, serp.reason));
    return parsed;
  });

  const linkedinDone = linkedinPromise.then((result) => {
    const parsed = result.ok ? parseLinkedInPayload(result.body) : null;
    if (parsed && linkedinUrl && !parsed.url) parsed.url = linkedinUrl;
    profile = parsed;
    const state = combineLinkedIn(linkedinUrl, result, Boolean(parsed));
    report = { ...report, linkedin: state.state, linkedinReason: state.reason };
    emit("linkedin", statusOf(state.state, state.reason));
    return parsed;
  });

  const siteDone = sitePromise.then((site) => {
    pages = site.pages;
    mined = site.mined;
    report = { ...report, unlock: site.state, unlockReason: site.reason };
    emit("site", statusOf(site.state, site.reason));
    return site;
  });

  const planDone = planPromise.then((next) => {
    report = { ...report, plan: next.mode };
    emit("plan", next.mode === "openai" ? "openai" : "template", next);
    return next;
  });

  const linksDone = Promise.all([serpDone, siteDone]).then(() => {
    const live = report.serp === "live" || report.unlock === "live";
    const timedOut = report.serpReason === "timed out" || report.unlockReason === "timed out";
    const failed = report.serp === "failed" || report.unlock === "failed";
    const status = live ? "live" : timedOut ? "timeout" : failed ? "failed" : "skipped";
    emit("links", status);
  });

  const [, , , settledPlan] = await Promise.all([serpDone, linkedinDone, siteDone, planDone, linksDone]);
  let finalPlan = settledPlan;
  const finalIntel = intelNow();
  if (args.planContextFor && claimSignature(finalIntel) !== claimSignature(args.snapshot)) {
    const revised = await withDeadline(
      deps.draftPlan(args.planContextFor(finalIntel)).catch(() => finalPlan),
      9_000,
      finalPlan,
    );
    finalPlan = revised;
    emit("plan", finalPlan.mode === "openai" ? "openai" : "template", finalPlan);
  }
  const bundle = bundleNow();
  return {
    intel: finalIntel,
    plan: finalPlan,
    report: { ...report, plan: finalPlan.mode },
    hits: publicHits,
    pages: mined,
    liveFetchedAt: foundSomething() ? fetchedAt : null,
    profiles: bundle.profiles,
    links: bundle.links,
  };
}

export function readingQueries(name: string, company: string): string[] {
  const who = `"${name}"`;
  return [
    `${who} ${company}`.trim(),
    `${who} news`,
    `${who} site:medium.com OR site:dev.to OR site:substack.com`,
    `${who} site:youtube.com OR site:github.com`,
    `${who} site:x.com OR site:twitter.com OR site:bsky.app OR site:instagram.com OR site:mastodon.social`,
  ];
}

async function loadSites(
  input: SnapshotInput,
  serpPromise: Promise<LiveResult[]>,
  deps: LiveDeps,
  siteMs: number,
): Promise<{ pages: UnlockedPage[]; mined: MinedPage[]; state: FetchState; reason: string }> {
  const started = Date.now();
  const known = seedPageUrls(input).slice(0, PAGE_CAP);
  const bucket: LiveResult[] = [];
  if (known.length > 0) {
    const outcome = await withDeadline(
      unlockAll(known, siteMs, deps, bucket).then(() => "done" as const),
      siteMs,
      "timeout" as const,
    );
    return summarizeSite(bucket.slice(), outcome);
  }
  const serp = await withDeadline(serpPromise, siteMs, null);
  const remaining = siteMs - (Date.now() - started);
  if (!serp || remaining <= 0) return summarizeSite([], "timeout");
  const targets = unlockTargetsFromSerp(serp, input.name).slice(0, PAGE_CAP);
  if (!targets.length) return summarizeSite([], "done");
  const outcome = await withDeadline(
    unlockAll(targets, remaining, deps, bucket).then(() => "done" as const),
    remaining,
    "timeout" as const,
  );
  return summarizeSite(bucket.slice(), outcome);
}

function summarizeSite(
  opened: LiveResult[],
  outcome: "done" | "timeout",
): { pages: UnlockedPage[]; mined: MinedPage[]; state: FetchState; reason: string } {
  const read = readOpened(opened);
  if (read.pages.length > 0) return { ...read, state: "live", reason: "" };
  if (outcome === "timeout") return { ...read, state: "failed", reason: "timed out" };
  if (!opened.length) return { ...read, state: "skipped", reason: "not requested" };
  const failed = opened.find((item) => !item.ok);
  return { ...read, state: "failed", reason: failed && !failed.ok ? failed.reason : "thin page" };
}

async function unlockAll(urls: string[], timeoutMs: number, deps: LiveDeps, bucket: LiveResult[]): Promise<void> {
  if (!urls.length || timeoutMs <= 0) return;
  await Promise.all(
    urls.map(async (url) => {
      const result = await callLive(() => deps.unlockPage(url, timeoutMs));
      bucket.push(result);
    }),
  );
}

function claimSignature(intel: PersonIntel): string {
  return [...intel.work, ...intel.education, ...intel.news, ...intel.standout, ...intel.talkingPoints]
    .map((claim) => claim.text)
    .join("\n");
}

function unlockTargetsFromSerp(results: LiveResult[], name: string): string[] {
  const parsed = parseSerpBatch(results);
  const preferred = pickPagesToOpen(parsed.publicHits, name);
  const namedHits = (parsed.intelHits.length ? parsed.intelHits : parsed.linkHits).filter((hit) =>
    textMentionsPerson(`${hit.title} ${hit.snippet} ${hit.url}`, name),
  );
  const fallback = preferred.length ? [] : pickUnlockTargets(namedHits, name, PAGE_CAP);
  return unique([...preferred, ...fallback]).slice(0, PAGE_CAP);
}

function parseSerpBatch(results: LiveResult[]): { intelHits: SerpHit[]; linkHits: SerpHit[]; publicHits: PublicHit[] } {
  const intelHits = [
    ...(results[0]?.ok ? parseSerp(results[0].body) : []),
    ...(results[1]?.ok ? parseSerp(results[1].body) : []),
  ];
  const linkHits = results.flatMap((result) => (result.ok ? parseSerp(result.body, { keepSocial: true, limit: 12 }) : []));
  const publicHits = linkHits.map((hit) => ({
    url: hit.url,
    title: hit.title,
    snippet: hit.snippet,
    kind: hit.kind,
  }));
  return { intelHits, linkHits, publicHits };
}

function readOpened(opened: LiveResult[]): { pages: UnlockedPage[]; mined: MinedPage[] } {
  const pages: UnlockedPage[] = [];
  const mined: MinedPage[] = [];
  for (const page of opened) {
    if (!page.ok) continue;
    const parsed = parsePage(page.body, page.url);
    mined.push({ url: page.url, title: parsed.title, html: page.body.slice(0, 400_000), fetchedAt: page.fetchedAt });
    if (parsed.excerpt.length < 80) continue;
    if (/captcha|access denied|enable javascript|are you a robot/i.test(parsed.excerpt)) continue;
    pages.push({ url: page.url, title: parsed.title, excerpt: parsed.excerpt, fetchedAt: page.fetchedAt });
  }
  return { pages, mined };
}

function combineSerp(results: LiveResult[], hasHits: boolean): { state: FetchState; reason: string } {
  if (hasHits) return { state: "live", reason: "" };
  const reasons = results.filter((item) => !item.ok).map((item) => item.reason);
  if (results.length && reasons.length === results.length && reasons.every((reason) => reason === "not configured")) {
    return { state: "skipped", reason: "not configured" };
  }
  const reason = reasons.find((item) => item && item !== "not configured") || "no public results";
  return { state: "failed", reason };
}

function combineLinkedIn(url: string | null, result: LiveResult, parsed: boolean): { state: FetchState; reason: string } {
  if (!url) return { state: "skipped", reason: "no public url" };
  if (result.ok && parsed) return { state: "live", reason: "" };
  if (!result.ok) return { state: "failed", reason: result.reason };
  return { state: "failed", reason: "unreadable profile" };
}

function statusOf(state: FetchState, reason: string): LiveUpdate["status"] {
  if (state === "live") return "live";
  if (state === "skipped") return "skipped";
  if (reason === "timed out") return "timeout";
  return "failed";
}

function callLive(run: () => Promise<LiveResult>): Promise<LiveResult> {
  return run().catch(() => ({ ok: false, reason: "request failed" }));
}

function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

function positive(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const clean = item.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}
