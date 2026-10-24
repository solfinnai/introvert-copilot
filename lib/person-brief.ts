import { cache } from "react";
import { getCatalog } from "./catalog";
import { curatedById } from "./curated";
import { henryPublic } from "./henry-profile";
import { BRIEF_CACHE_VERSION, isStoredBrief, readBriefCache, writeBriefCache, type CachedBrief } from "./intel-cache";
import { shareInflight } from "./inflight";
import { markCached, buildSnapshotIntel, type PersonIntel, type SnapshotInput } from "./intel";
import { collectLive, type CollectedBrief } from "./live-brief";
import type { LiveUpdate } from "./live-update";
import { templatePlan, pathText, type ConversationPlan, type PlanContext } from "./plan";
import { buildPublicBundle, type PublicLink, type SocialProfile } from "./public-links";
import { personCard } from "./rank";
import { leadSentences } from "./text";
import type { RankedPerson } from "./types";

export interface PersonBrief {
  intel: PersonIntel;
  plan: ConversationPlan;
  report: CollectedBrief["report"];
  fromCache: boolean;
  profiles: SocialProfile[];
  links: PublicLink[];
}

type Listener = (update: LiveUpdate) => void;

interface Bus {
  events: LiveUpdate[];
  listeners: Set<Listener>;
}

const buses = new Map<string, Bus>();
const freshComputes = new Set<string>();
const uncachedBriefs = new Map<string, PersonBrief>();

/** A finished brief that is not worth caching, handed back to the caller that already computed it. */
export function holdUncachedBrief(id: string, brief: PersonBrief): void {
  uncachedBriefs.set(id, brief);
}

export function takeUncachedBrief(id: string): PersonBrief | undefined {
  const brief = uncachedBriefs.get(id);
  if (brief) uncachedBriefs.delete(id);
  return brief;
}

export const loadPersonBrief = cache((card: RankedPerson) =>
  shareInflight(`brief:${card.id}`, () => loadThroughRuntime(card)),
);

export function watchPersonBrief(card: RankedPerson, listener: Listener): Promise<PersonBrief> {
  let bus = buses.get(card.id);
  if (!bus) {
    bus = { events: [], listeners: new Set() };
    buses.set(card.id, bus);
  }
  for (const event of bus.events) listener(event);
  bus.listeners.add(listener);
  const current = bus;
  return loadPersonBrief(card).finally(() => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0 && buses.get(card.id) === current) buses.delete(card.id);
  });
}

export function buildSeedBrief(card: RankedPerson): PersonBrief {
  const input = snapshotInput(card);
  const intel = buildSnapshotIntel(input);
  const person = getCatalog().peopleById.get(card.id);
  const bundle = buildPublicBundle({
    name: input.name,
    company: input.company,
    linkedinUrl: input.linkedinUrl,
    twitterHandle: person?.twitterHandle ?? null,
    sources: input.sources,
    snapshotFetchedAt: input.fetchedAt,
    hits: [],
    pages: [],
    liveFetchedAt: null,
  });
  return {
    intel,
    plan: templatePlan(planContext(card, input, intel)),
    report: {
      serp: "skipped",
      unlock: "skipped",
      linkedin: "skipped",
      plan: "template",
      serpReason: "not requested",
      unlockReason: "not requested",
      linkedinReason: input.linkedinUrl ? "not requested" : "no public url",
    },
    profiles: bundle.profiles,
    links: bundle.links,
    fromCache: false,
  };
}

export async function computePersonBrief(id: string): Promise<PersonBrief | null> {
  const card = personCard(getCatalog(), id, null, { day: "both", metIds: [], limit: 1 });
  if (!card) return null;
  freshComputes.add(id);
  try {
    return await loadPersonBriefInner(card);
  } catch (error) {
    freshComputes.delete(id);
    throw error;
  }
}

async function loadThroughRuntime(card: RankedPerson): Promise<PersonBrief> {
  const memory = await readBriefCache(card.id).catch(() => null);
  if (memory) return briefFromCache(memory);
  if (!liveConfigured()) return loadPersonBriefInner(card);
  try {
    const { loadRuntimeBrief } = await import("./runtime-brief");
    const record = await loadRuntimeBrief(card.id);
    const justComputed = freshComputes.delete(card.id);
    if (!record?.brief) return loadPersonBriefInner(card);
    if (justComputed) return record.brief;
    const cached = markRuntimeHit(record.brief);
    await remember(card.id, cached);
    return cached;
  } catch {
    const held = takeUncachedBrief(card.id);
    if (held) {
      freshComputes.delete(card.id);
      return held;
    }
    const justComputed = freshComputes.delete(card.id);
    if (justComputed) {
      const stored = await readBriefCache(card.id).catch(() => null);
      if (stored) return briefFromCache(stored);
    }
    return loadPersonBriefInner(card);
  }
}

async function loadPersonBriefInner(card: RankedPerson): Promise<PersonBrief> {
  const input = snapshotInput(card);
  const snapshot = buildSnapshotIntel(input);
  const cached = await readBriefCache(card.id).catch(() => null);
  if (cached) {
    console.log(`Person brief ${card.id}: cache hit mode=${cached.intel.mode} plan=${cached.plan.mode}`);
    return briefFromCache(cached);
  }
  const person = getCatalog().peopleById.get(card.id);
  const collected = await collectLive({
    input,
    snapshot,
    planContext: planContext(card, input, snapshot),
    twitterHandle: person?.twitterHandle ?? null,
    onUpdate: (update) => emitUpdate(card.id, update),
  });
  const brief: PersonBrief = {
    intel: collected.intel,
    plan: collected.plan,
    report: collected.report,
    profiles: collected.profiles,
    links: collected.links,
    fromCache: false,
  };
  await remember(card.id, brief);
  console.log(
    `Person brief ${card.id}: mode=${brief.intel.mode} serp=${brief.report.serp} unlock=${brief.report.unlock} linkedin=${brief.report.linkedin} plan=${brief.plan.mode} profiles=${brief.profiles.length} links=${brief.links.length}`,
  );
  return brief;
}

function emitUpdate(id: string, update: LiveUpdate): void {
  const bus = buses.get(id);
  if (!bus) return;
  bus.events.push(update);
  for (const listener of bus.listeners) {
    try {
      listener(update);
    } catch {
      /* A dropped client should not stop the fetch. */
    }
  }
}

function liveConfigured(): boolean {
  return Boolean((process.env.BRIGHTDATA_API_KEY || "").trim() || (process.env.OPENAI_API_KEY || "").trim());
}

function briefFromCache(cached: CachedBrief): PersonBrief {
  return {
    intel: cached.intel,
    plan: cached.plan,
    report: cached.report,
    profiles: cached.profiles,
    links: cached.links,
    fromCache: true,
  };
}

function markRuntimeHit(brief: PersonBrief): PersonBrief {
  return { ...brief, fromCache: true, intel: markCached(brief.intel) };
}

async function remember(id: string, brief: PersonBrief): Promise<void> {
  const stored: CachedBrief = {
    version: BRIEF_CACHE_VERSION,
    savedAt: new Date().toISOString(),
    intel: brief.intel,
    plan: brief.plan,
    report: brief.report,
    profiles: brief.profiles,
    links: brief.links,
  };
  if (!isStoredBrief(stored)) return;
  await writeBriefCache(id, stored).catch(() => undefined);
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
