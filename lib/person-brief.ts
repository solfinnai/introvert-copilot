import { cache } from "react";
import { shareInflight } from "./inflight";
import { searchGoogle, scrapeLinkedIn, unlockPage, type LiveResult } from "./brightdata";
import { getCatalog } from "./catalog";
import { curatedById } from "./curated";
import { henryPublic } from "./henry-profile";
import { BRIEF_CACHE_VERSION, readBriefCache, writeBriefCache } from "./intel-cache";
import {
  buildPublicBundle,
  pickPagesToOpen,
  textMentionsPerson,
  type MinedPage,
  type PublicHit,
  type PublicLink,
  type SocialProfile,
} from "./public-links";
import {
  applyLiveSources,
  buildSnapshotIntel,
  parseLinkedInPayload,
  parsePage,
  parseSerp,
  pickUnlockTargets,
  normalizeLinkedIn,
  type FetchReport,
  type FetchState,
  type LivePieces,
  type PersonIntel,
  type SnapshotInput,
  type UnlockedPage,
} from "./intel";
import { draftPlan, pathText, type ConversationPlan, type PlanContext } from "./plan";
import { leadSentences } from "./text";
import type { RankedPerson } from "./types";

export interface PersonBrief {
  intel: PersonIntel;
  plan: ConversationPlan;
  report: FetchReport;
  fromCache: boolean;
  profiles: SocialProfile[];
  links: PublicLink[];
}

export const loadPersonBrief = cache((card: RankedPerson) =>
  shareInflight(`brief:${card.id}`, () => loadPersonBriefInner(card)),
);

async function loadPersonBriefInner(card: RankedPerson): Promise<PersonBrief> {
  const input = snapshotInput(card);
  const snapshot = buildSnapshotIntel(input);
  const cached = await readBriefCache(card.id).catch(() => null);
  if (cached) {
    console.log(`Person brief ${card.id}: cache hit mode=${cached.intel.mode} plan=${cached.plan.mode}`);
    return {
      intel: cached.intel,
      plan: cached.plan,
      report: cached.report,
      profiles: cached.profiles,
      links: cached.links,
      fromCache: true,
    };
  }

  let intel = snapshot;
  let report = emptyReport();
  let hits: PublicHit[] = [];
  let pages: MinedPage[] = [];
  let liveFetchedAt: string | null = null;
  try {
    const gathered = await gather(input, snapshot);
    intel = gathered.intel;
    report = gathered.report;
    hits = gathered.hits;
    pages = gathered.pages;
    liveFetchedAt = gathered.liveFetchedAt;
  } catch {
    intel = snapshot;
    report = {
      ...emptyReport(),
      serpReason: "request failed",
      unlockReason: "request failed",
      linkedinReason: input.linkedinUrl ? "request failed" : "no public url",
      linkedin: input.linkedinUrl ? "failed" : "skipped",
    };
  }

  const person = getCatalog().peopleById.get(card.id);
  const bundle = buildPublicBundle({
    name: input.name,
    company: input.company,
    linkedinUrl: input.linkedinUrl,
    twitterHandle: person?.twitterHandle ?? null,
    sources: input.sources,
    snapshotFetchedAt: input.fetchedAt,
    hits,
    pages,
    liveFetchedAt,
  });
  const plan = await draftPlan(planContext(card, input, intel));
  report = { ...report, plan: plan.mode };
  const discovered = bundle.profiles.some((profile) => profile.origin === "live") || bundle.links.some((link) => link.origin === "live");
  if (intel.mode !== "snapshot" || plan.mode === "openai" || discovered) {
    await writeBriefCache(card.id, {
      version: BRIEF_CACHE_VERSION,
      savedAt: new Date().toISOString(),
      intel,
      plan,
      report,
      profiles: bundle.profiles,
      links: bundle.links,
    }).catch(() => undefined);
  }
  console.log(
    `Person brief ${card.id}: mode=${intel.mode} serp=${report.serp} unlock=${report.unlock} linkedin=${report.linkedin} plan=${plan.mode} profiles=${bundle.profiles.length} links=${bundle.links.length}`,
  );
  return { intel, plan, report, profiles: bundle.profiles, links: bundle.links, fromCache: false };
}

async function gather(
  input: SnapshotInput,
  snapshot: PersonIntel,
): Promise<{ intel: PersonIntel; report: FetchReport; hits: PublicHit[]; pages: MinedPage[]; liveFetchedAt: string | null }> {
  const linkedinUrl = normalizeLinkedIn(input.linkedinUrl);
  const queries = readingQueries(input.name, input.company);
  const results = await Promise.all([
    ...queries.map((query) => searchGoogle(query)),
    linkedinUrl ? scrapeLinkedIn(linkedinUrl) : Promise.resolve({ ok: false as const, reason: "no public url" }),
  ]);
  const serpResults = results.slice(0, queries.length);
  const linkedin = results[results.length - 1];
  const intelHits = [
    ...(serpResults[0]?.ok ? parseSerp(serpResults[0].body) : []),
    ...(serpResults[1]?.ok ? parseSerp(serpResults[1].body) : []),
  ];
  const linkHits = serpResults.flatMap((result) =>
    result.ok ? parseSerp(result.body, { keepSocial: true, limit: 12 }) : [],
  );
  const publicHits: PublicHit[] = linkHits.map((hit) => ({
    url: hit.url,
    title: hit.title,
    snippet: hit.snippet,
    kind: hit.kind,
  }));
  const preferred = pickPagesToOpen(publicHits, input.name);
  const namedHits = (intelHits.length ? intelHits : linkHits).filter((hit) =>
    textMentionsPerson(`${hit.title} ${hit.snippet} ${hit.url}`, input.name),
  );
  const fallback = preferred.length ? [] : pickUnlockTargets(namedHits, input.name, 2);
  const targets = unique([...preferred, ...fallback]).slice(0, 2);
  const opened = targets.length ? await Promise.all(targets.map((url) => unlockPage(url))) : [];
  const pages: UnlockedPage[] = [];
  const mined: MinedPage[] = [];
  for (const page of opened) {
    if (!page.ok) continue;
    const parsed = parsePage(page.body, page.url);
    mined.push({ url: page.url, title: parsed.title, html: page.body.slice(0, 400_000), fetchedAt: page.fetchedAt });
    if (parsed.excerpt.length < 80) continue;
    if (/captcha|access denied|enable javascript|are you a robot/i.test(parsed.excerpt)) continue;
    pages.push({
      url: page.url,
      title: parsed.title,
      excerpt: parsed.excerpt,
      fetchedAt: page.fetchedAt,
    });
  }
  const unlock = combineUnlock(targets.length, pages.length, opened);
  const profile = linkedin.ok ? parseLinkedInPayload(linkedin.body) : null;
  const linkedinState = combineLinkedIn(linkedinUrl, linkedin, Boolean(profile));
  if (profile && linkedinUrl && !profile.url) profile.url = linkedinUrl;
  const liveAt = new Date().toISOString();
  const live: LivePieces = {
    fetchedAt: liveAt,
    linkedin: profile,
    serp: intelHits,
    pages,
  };
  const intel = profile || intelHits.length || pages.length ? applyLiveSources(snapshot, live, input) : snapshot;
  const foundSomething = publicHits.length > 0 || mined.length > 0 || Boolean(profile) || intelHits.length > 0;
  const serp = combineSerp(serpResults, publicHits.length > 0 || intelHits.length > 0);
  return {
    intel,
    hits: publicHits,
    pages: mined,
    liveFetchedAt: foundSomething ? liveAt : null,
    report: {
      serp: serp.state,
      unlock: unlock.state,
      linkedin: linkedinState.state,
      plan: "template",
      serpReason: serp.reason,
      unlockReason: unlock.reason,
      linkedinReason: linkedinState.reason,
    },
  };
}

function readingQueries(name: string, company: string): string[] {
  const who = `"${name}"`;
  return [
    `${who} ${company}`.trim(),
    `${who} news`,
    `${who} site:medium.com OR site:dev.to OR site:substack.com`,
    `${who} site:youtube.com OR site:github.com`,
    `${who} site:x.com OR site:twitter.com OR site:bsky.app OR site:instagram.com OR site:mastodon.social`,
  ];
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

function combineUnlock(
  targets: number,
  pages: number,
  opened: LiveResult[],
): { state: FetchState; reason: string } {
  if (!targets) return { state: "skipped", reason: "not requested" };
  if (pages > 0) return { state: "live", reason: "" };
  const failed = opened.find((item) => !item.ok);
  return { state: "failed", reason: failed && !failed.ok ? failed.reason : "thin page" };
}

function combineLinkedIn(
  url: string | null,
  result: LiveResult,
  parsed: boolean,
): { state: FetchState; reason: string } {
  if (!url) return { state: "skipped", reason: "no public url" };
  if (result.ok && parsed) return { state: "live", reason: "" };
  if (!result.ok) return { state: "failed", reason: result.reason };
  return { state: "failed", reason: "unreadable profile" };
}

function snapshotInput(card: RankedPerson): SnapshotInput {
  const catalog = getCatalog();
  const person = catalog.peopleById.get(card.id);
  const curated = curatedById(card.id);
  const session = person?.sessionIds
    .map((sid) => catalog.sessionsById.get(sid))
    .find((item) => item && !item.skip);
  const topics = unique([...(session?.topics ?? []), ...(curated?.topics ?? []), ...card.sharedTopics]);
  const sources: { url: string; title: string; date?: string }[] = (curated?.sources ?? [])
    .filter((source) => source.url && source.url !== "GAP")
    .map((source) => ({
      url: source.url as string,
      title: source.title || hostLabel(source.url || ""),
      date: source.date,
    }));
  if (!sources.length) {
    sources.push({ url: catalog.catalogUrl, title: "GitHub Universe speaker catalog" });
    for (const article of person?.articles ?? []) {
      sources.push({ url: article.url, title: article.label });
    }
  }
  return {
    name: card.name,
    title: person?.title || card.title,
    company: person?.company || card.company,
    bio: person?.bio || card.bio,
    sessionTitle: session?.title || card.sessionTitle,
    sessionAbstract: session?.abstract || "",
    topics,
    sources,
    catalogUrl: catalog.catalogUrl,
    fetchedAt: curated?.fetched_at || catalog.fetchedAt,
    linkedinUrl: person?.linkedinUrl || curated?.linkedin_url || card.linkedinUrl,
  };
}

function planContext(card: RankedPerson, input: SnapshotInput, intel: PersonIntel): PlanContext {
  const henry = henryPublic();
  const claims = [...intel.work, ...intel.education, ...intel.news, ...intel.standout, ...intel.talkingPoints]
    .slice(0, 8)
    .map((item) => `${item.text} (${item.sourceLabel})`);
  return {
    name: input.name,
    title: input.title,
    company: input.company,
    sessionTitle: input.sessionTitle,
    sharedTopics: card.sharedTopics,
    keywordHits: card.keywordHits,
    pathText: pathText(card.path),
    bioLead: leadSentences(input.bio),
    introName: card.introVia?.name ?? null,
    henryCompany: henry.company || "Unicorn Studios",
    henryAbout: henry.about,
    henryCity: henry.location || "San Francisco",
    henrySite: henry.companyUrl,
    henryPosts: henry.posts.map((post) => post.title),
    henryGoal: henry.demoGoal,
    henryTalkingPoints: henry.talkingPoints.filter((point) => point.source === "confirmed").map((point) => point.text),
    claims,
  };
}

function emptyReport(): FetchReport {
  return {
    serp: "failed",
    unlock: "skipped",
    linkedin: "skipped",
    plan: "template",
    serpReason: "request failed",
    unlockReason: "not requested",
    linkedinReason: "no public url",
  };
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

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}
