import { searchGoogle, scrapeLinkedIn, unlockPage, type LiveResult } from "./brightdata";
import { getCatalog } from "./catalog";
import { curatedById } from "./curated";
import { henryPublic } from "./henry-profile";
import { readBriefCache, writeBriefCache } from "./intel-cache";
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
}

export async function loadPersonBrief(card: RankedPerson): Promise<PersonBrief> {
  const input = snapshotInput(card);
  const snapshot = buildSnapshotIntel(input);
  const cached = await readBriefCache(card.id).catch(() => null);
  if (cached) {
    console.log(`Person brief ${card.id}: cache hit mode=${cached.intel.mode} plan=${cached.plan.mode}`);
    return { intel: cached.intel, plan: cached.plan, report: cached.report, fromCache: true };
  }

  let intel = snapshot;
  let report = emptyReport();
  try {
    const gathered = await gather(input, snapshot);
    intel = gathered.intel;
    report = gathered.report;
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

  const plan = await draftPlan(planContext(card, input, intel));
  report = { ...report, plan: plan.mode };
  if (intel.mode !== "snapshot" || plan.mode === "openai") {
    await writeBriefCache(card.id, {
      version: 1,
      savedAt: new Date().toISOString(),
      intel,
      plan,
      report,
    }).catch(() => undefined);
  }
  console.log(
    `Person brief ${card.id}: mode=${intel.mode} serp=${report.serp} unlock=${report.unlock} linkedin=${report.linkedin} plan=${plan.mode}`,
  );
  return { intel, plan, report, fromCache: false };
}

async function gather(
  input: SnapshotInput,
  snapshot: PersonIntel,
): Promise<{ intel: PersonIntel; report: FetchReport }> {
  const linkedinUrl = normalizeLinkedIn(input.linkedinUrl);
  const [serpA, serpB, linkedin] = await Promise.all([
    searchGoogle(`"${input.name}" ${input.company}`.trim()),
    searchGoogle(`"${input.name}" news`),
    linkedinUrl ? scrapeLinkedIn(linkedinUrl) : Promise.resolve({ ok: false as const, reason: "no public url" }),
  ]);
  const hits = [...(serpA.ok ? parseSerp(serpA.body) : []), ...(serpB.ok ? parseSerp(serpB.body) : [])];
  const serp = combineSerp(serpA, serpB, hits.length > 0);
  const targets = hits.length ? pickUnlockTargets(hits, input.name, 2) : [];
  const opened = targets.length ? await Promise.all(targets.map((url) => unlockPage(url))) : [];
  const pages: UnlockedPage[] = [];
  for (const page of opened) {
    if (!page.ok) continue;
    const parsed = parsePage(page.body, page.url);
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
  const live: LivePieces = {
    fetchedAt: new Date().toISOString(),
    linkedin: profile,
    serp: hits,
    pages,
  };
  const intel =
    profile || hits.length || pages.length ? applyLiveSources(snapshot, live, input) : snapshot;
  return {
    intel,
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

function combineSerp(
  a: LiveResult,
  b: LiveResult,
  hasHits: boolean,
): { state: FetchState; reason: string } {
  if (hasHits) return { state: "live", reason: "" };
  const reasons = [a, b].filter((item) => !item.ok).map((item) => item.reason);
  if (reasons.length && reasons.every((reason) => reason === "not configured")) {
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
