import { sanitizeCopy } from "./sanitize";
import { humanList, leadSentences } from "./text";

export type IntelMode = "live" | "cache" | "snapshot";
export type FetchState = "live" | "failed" | "skipped";
export type Confidence = "low" | "medium" | "high";
export type Origin = "live" | "snapshot";

export interface Claim {
  text: string;
  sourceUrl: string;
  sourceLabel: string;
  fetchedAt: string;
  confidence: Confidence;
  inference: boolean;
  origin: Origin;
}

export interface PersonalityRead {
  summary: string;
  communication: string;
  confidence: Confidence;
  sourceUrl: string;
  sourceLabel: string;
  fetchedAt: string;
  origin: Origin;
  label: string;
}

export interface PersonIntel {
  mode: IntelMode;
  label: string;
  fetchedAt: string;
  work: Claim[];
  education: Claim[];
  workGap: string | null;
  educationGap: string | null;
  workGapOrigin: Origin | null;
  educationGapOrigin: Origin | null;
  personality: PersonalityRead;
  psychographics: Claim[];
  news: Claim[];
  newsNote: string | null;
  standout: Claim[];
  talkingPoints: Claim[];
  sources: { url: string; label: string; fetchedAt: string; origin: Origin }[];
}

export interface SnapshotInput {
  name: string;
  title: string;
  company: string;
  bio: string;
  sessionTitle: string | null;
  sessionAbstract: string;
  topics: string[];
  sources: { url: string; title: string; date?: string }[];
  catalogUrl: string;
  fetchedAt: string;
  linkedinUrl: string | null;
}

export interface SerpHit {
  url: string;
  title: string;
  snippet: string;
  kind: "organic" | "news";
  date: string;
}

export interface LinkedInJob {
  title: string;
  company: string;
  when: string;
}

export interface LinkedInSchool {
  school: string;
  detail: string;
}

export interface LinkedInProfile {
  name: string;
  url: string;
  about: string;
  city: string;
  company: string;
  headline: string;
  avatar: string;
  experience: LinkedInJob[];
  education: LinkedInSchool[];
  experienceGap: boolean;
  educationGap: boolean;
}

export interface UnlockedPage {
  url: string;
  title: string;
  excerpt: string;
  fetchedAt: string;
}

export interface LivePieces {
  fetchedAt: string;
  linkedin: LinkedInProfile | null;
  serp: SerpHit[];
  pages: UnlockedPage[];
}

export interface FetchReport {
  serp: FetchState;
  unlock: FetchState;
  linkedin: FetchState;
  plan: "openai" | "template";
  serpReason: string;
  unlockReason: string;
  linkedinReason: string;
}

const DIAGNOSIS = "Inference from public sources. Not a diagnosis.";
const ROLE =
  /\b(currently|founder|co-founder|president|partner|director|professor|chief|head of|vice president|ceo|cto|cvo|cvp|joined|serves|worked|works|leads|led)\b/i;
const EMPHASIS = ["design", "research", "open source", "education", "community", "craft", "simplicity", "agents", "story"];

export function modeLabel(mode: IntelMode): string {
  if (mode === "live") return "Live public web";
  if (mode === "cache") return "Cached live fetch";
  return "Cached snapshot";
}

export function markCached(intel: PersonIntel): PersonIntel {
  if (intel.mode === "snapshot") return intel;
  return { ...intel, mode: "cache", label: modeLabel("cache") };
}

export function sectionLabel(mode: IntelMode, origins: Array<Origin | null>): string {
  const set = new Set(origins.filter((item): item is Origin => item === "live" || item === "snapshot"));
  if (set.has("live") && set.has("snapshot")) {
    return mode === "cache" ? "Cached live fetch and cached snapshot" : "Live public web and cached snapshot";
  }
  if (set.has("live")) return mode === "cache" ? "Cached live fetch" : "Live public web";
  return "Cached snapshot";
}

export function describeFetches(report: FetchReport, mode: IntelMode): string {
  const parts = [
    bit("Google results", report.serp, report.serpReason),
    bit("Public page", report.unlock, report.unlockReason),
    bit("LinkedIn dataset", report.linkedin, report.linkedinReason),
    report.plan === "openai"
      ? "Conversation plan drafted for this person"
      : "Conversation plan from your graph path",
  ];
  const detail = `${parts.join(". ")}.`;
  if (mode === "snapshot") return `Cached snapshot. ${detail}`;
  if (mode === "cache") return `Cached live fetch. ${detail}`;
  return detail;
}

export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  }).format(date);
}

export function isLinkedInUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return /linkedin\.com/i.test(url);
  }
}

export function normalizeLinkedIn(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = input.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) return null;
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    slug = match[1];
  }
  slug = slug.replace(/\/+$/, "").trim();
  if (!slug || slug.length > 120) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

export function isBlockedPublicUrl(url: string): boolean {
  if (isLinkedInUrl(url)) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "google.com" || host.endsWith(".google.com")) return true;
    if (host === "gstatic.com" || host.endsWith(".gstatic.com")) return true;
    if (host.endsWith("googleusercontent.com")) return true;
    const social = ["facebook.com", "instagram.com", "tiktok.com", "twitter.com", "x.com"];
    if (social.some((item) => host === item || host.endsWith(`.${item}`))) return true;
    return false;
  } catch {
    return true;
  }
}

export function parseSerp(body: string): SerpHit[] {
  const trimmed = body.trim().slice(0, 1_500_000);
  if (!trimmed) return [];
  if (trimmed.startsWith("<")) return dedupeHits(parseSerpHtml(trimmed));
  try {
    const hits = hitsFromJson(JSON.parse(trimmed) as unknown);
    if (hits.length) return dedupeHits(hits);
  } catch {
    /* HTML or plain text falls through */
  }
  if (trimmed.includes("<a")) return dedupeHits(parseSerpHtml(trimmed));
  return [];
}

export function parsePage(body: string, url: string): { title: string; excerpt: string } {
  const slice = body.slice(0, 400_000);
  const titleMatch = slice.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const heading = slice.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || slice.match(/^#\s+(.+)$/m);
  const title = sanitizeCopy(stripTags(titleMatch?.[1] || heading?.[1] || "")).slice(0, 140);
  const text = sanitizeCopy(
    slice
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"),
  );
  return { title: title || hostOf(url), excerpt: text.slice(0, 700) };
}

export function parseLinkedInPayload(body: string): LinkedInProfile | null {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  const record = firstProfile(value);
  if (!record) return null;
  if (typeof record.snapshot_id === "string" && typeof record.name !== "string") return null;
  const name = stringField(record, ["name"]);
  if (!name) return null;
  const url =
    normalizeLinkedIn(stringField(record, ["input_url", "url"])) ||
    stringField(record, ["input_url", "url"]);
  const experience = readExperience(record.experience);
  const education = readEducation(record.education);
  const companyObject =
    record.current_company && typeof record.current_company === "object"
      ? stringField(record.current_company as Record<string, unknown>, ["name"])
      : "";
  const headline = stringField(record, ["headline"]);
  const position = stringField(record, ["position"]);
  return {
    name,
    url,
    about: sanitizeCopy(stringField(record, ["about"])),
    city: stringField(record, ["city", "location"]),
    company: companyObject || stringField(record, ["current_company_name"]),
    headline: sanitizeCopy(headline || position),
    avatar: stringField(record, ["avatar"]),
    experience,
    education,
    experienceGap: experience.length === 0,
    educationGap: education.length === 0,
  };
}

export function extractSchools(bio: string): string[] {
  const patterns = [
    /\bMIT\s+Media\s+Lab\b/g,
    /\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+School\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\b/g,
    /\b(?:University|College|Institute)\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\b/g,
    /\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+(?:University|College|Institute)\b/g,
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of bio.matchAll(pattern)) {
      const text = match[0].replace(/^the\s+/i, "").trim();
      if (!text) continue;
      if (found.some((item) => item.toLowerCase() === text.toLowerCase())) continue;
      found.push(text);
    }
  }
  return found.slice(0, 6);
}

export function pickUnlockTargets(hits: SerpHit[], name: string, limit = 2): string[] {
  const last = name.split(/\s+/).filter(Boolean).pop()?.toLowerCase() ?? "";
  const ranked = hits
    .filter((hit) => !isBlockedPublicUrl(hit.url))
    .map((hit, index) => ({
      url: hit.url,
      index,
      score: last.length > 2 && hit.url.toLowerCase().includes(last) ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const urls: string[] = [];
  const hosts = new Set<string>();
  for (const item of ranked) {
    let host = "";
    try {
      host = new URL(item.url).hostname;
    } catch {
      continue;
    }
    if (hosts.has(host)) continue;
    hosts.add(host);
    urls.push(item.url);
    if (urls.length >= limit) break;
  }
  return urls;
}

export function buildSnapshotIntel(input: SnapshotInput): PersonIntel {
  const fetchedAt = input.fetchedAt || "";
  const catalog = input.catalogUrl || input.sources[0]?.url || "";
  const bio = sanitizeCopy(input.bio || "");
  const work = workFromCatalog(input, bio, catalog, fetchedAt);
  const schools = extractSchools(bio);
  const education = schools.map((school) =>
    makeClaim({
      text: `The conference bio names ${school}.`,
      sourceUrl: catalog,
      sourceLabel: "GitHub Universe speaker catalog",
      fetchedAt,
      confidence: "medium",
      inference: false,
      origin: "snapshot",
    }),
  );
  const news = newsFromSources(input, fetchedAt);
  const standout = [
    makeClaim({
      text: bestSentence(bio) || fallbackStandout(input),
      sourceUrl: catalog,
      sourceLabel: "GitHub Universe speaker catalog",
      fetchedAt,
      confidence: bio ? "medium" : "low",
      inference: false,
      origin: "snapshot",
    }),
  ];
  const talkingPoints = talkingFromCatalog(input, catalog, fetchedAt);
  const sourceCount = 1 + input.sources.filter((source) => source.url && !isCatalogSource(source.url, catalog)).length;
  const personality = inferPersonality({
    name: input.name,
    title: input.title,
    bio,
    sessionTitle: input.sessionTitle,
    sourceUrl: catalog,
    sourceLabel: "GitHub Universe speaker catalog",
    fetchedAt,
    origin: "snapshot",
    sourceCount,
  });
  const psychographics = psychographicsFrom(input, bio, catalog, fetchedAt);
  const sources = uniqueSources([
    { url: catalog, label: "GitHub Universe speaker catalog", fetchedAt, origin: "snapshot" as const },
    ...input.sources
      .filter((source) => source.url)
      .map((source) => ({
        url: source.url,
        label: source.title || hostOf(source.url),
        fetchedAt,
        origin: "snapshot" as const,
      })),
  ]);
  return {
    mode: "snapshot",
    label: modeLabel("snapshot"),
    fetchedAt,
    work,
    education,
    workGap: work.length ? null : "No public work history in the cached snapshot.",
    educationGap: education.length ? null : "No public education history in the cached snapshot.",
    workGapOrigin: work.length ? null : "snapshot",
    educationGapOrigin: education.length ? null : "snapshot",
    personality,
    psychographics,
    news,
    newsNote: news.length ? null : "No recent news in the cached snapshot.",
    standout,
    talkingPoints,
    sources,
  };
}

export function applyLiveSources(snapshot: PersonIntel, live: LivePieces, context: SnapshotInput): PersonIntel {
  if (!live.linkedin && live.serp.length === 0 && live.pages.length === 0) return snapshot;
  const intel: PersonIntel = {
    ...snapshot,
    mode: "live",
    label: modeLabel("live"),
    fetchedAt: live.fetchedAt,
    work: [...snapshot.work],
    education: [...snapshot.education],
    news: [...snapshot.news],
    standout: [...snapshot.standout],
    talkingPoints: [...snapshot.talkingPoints],
    psychographics: [...snapshot.psychographics],
    sources: [...snapshot.sources],
    personality: snapshot.personality,
  };

  if (live.linkedin) {
    const profile = live.linkedin;
    const sourceUrl = profile.url || normalizeLinkedIn(context.linkedinUrl) || context.catalogUrl;
    if (profile.company) {
      intel.work = [
        makeClaim({
          text: `Current company on LinkedIn: ${profile.company}.`,
          sourceUrl,
          sourceLabel: "LinkedIn profile",
          fetchedAt: live.fetchedAt,
          confidence: "high",
          inference: false,
          origin: "live",
        }),
        ...intel.work,
      ];
    }
    if (profile.headline) {
      intel.work = [
        makeClaim({
          text: `LinkedIn headline: ${profile.headline}.`,
          sourceUrl,
          sourceLabel: "LinkedIn profile",
          fetchedAt: live.fetchedAt,
          confidence: "high",
          inference: false,
          origin: "live",
        }),
        ...intel.work,
      ];
    }
    if (profile.experience.length) {
      const jobs = profile.experience.map((job) =>
        makeClaim({
          text: jobLine(job),
          sourceUrl,
          sourceLabel: "LinkedIn profile",
          fetchedAt: live.fetchedAt,
          confidence: "high",
          inference: false,
          origin: "live",
        }),
      );
      intel.work = [...jobs, ...intel.work];
      intel.workGap = null;
      intel.workGapOrigin = null;
    } else {
      intel.workGap = "LinkedIn returned no experience entries.";
      intel.workGapOrigin = "live";
    }
    if (profile.education.length) {
      const schools = profile.education.map((school) =>
        makeClaim({
          text: school.detail ? `${school.school}, ${school.detail}.` : `${school.school}.`,
          sourceUrl,
          sourceLabel: "LinkedIn profile",
          fetchedAt: live.fetchedAt,
          confidence: "high",
          inference: false,
          origin: "live",
        }),
      );
      intel.education = [...schools, ...intel.education];
      intel.educationGap = null;
      intel.educationGapOrigin = null;
    } else {
      intel.educationGap = "LinkedIn returned no education entries.";
      intel.educationGapOrigin = "live";
    }
    if (profile.about) {
      intel.standout = [
        makeClaim({
          text: profile.about,
          sourceUrl,
          sourceLabel: "LinkedIn profile",
          fetchedAt: live.fetchedAt,
          confidence: "high",
          inference: false,
          origin: "live",
        }),
        ...intel.standout,
      ];
    }
    intel.sources = uniqueSources([
      { url: sourceUrl, label: "LinkedIn profile", fetchedAt: live.fetchedAt, origin: "live" },
      ...intel.sources,
    ]);
    const about = profile.about.length >= 40 ? profile.about : context.bio;
    intel.personality = inferPersonality({
      name: context.name,
      title: context.title,
      bio: about,
      sessionTitle: context.sessionTitle,
      sourceUrl: profile.about.length >= 40 ? sourceUrl : context.catalogUrl,
      sourceLabel: profile.about.length >= 40 ? "LinkedIn profile" : "GitHub Universe speaker catalog",
      fetchedAt: profile.about.length >= 40 ? live.fetchedAt : snapshot.fetchedAt,
      origin: profile.about.length >= 40 ? "live" : "snapshot",
      sourceCount: 1 + live.serp.length + live.pages.length,
    });
  }

  if (live.serp.length) {
    const fresh = live.serp.slice(0, 5).map((hit) =>
      makeClaim({
        text: hit.snippet ? `${hit.title}. ${hit.snippet}` : hit.title,
        sourceUrl: hit.url,
        sourceLabel: hit.kind === "news" ? hit.title || "News result" : hit.title || hostOf(hit.url),
        fetchedAt: live.fetchedAt,
        confidence: hit.kind === "news" ? "medium" : "low",
        inference: false,
        origin: "live",
      }),
    );
    const seen = new Set(fresh.map((item) => item.sourceUrl));
    intel.news = [...fresh, ...snapshot.news.filter((item) => !seen.has(item.sourceUrl))];
    intel.newsNote = live.serp.some((hit) => hit.kind === "news")
      ? null
      : "No dated news block. These are the top public results.";
    intel.sources = uniqueSources([
      ...intel.sources,
      ...live.serp.slice(0, 6).map((hit) => ({
        url: hit.url,
        label: hit.title || hostOf(hit.url),
        fetchedAt: live.fetchedAt,
        origin: "live" as const,
      })),
    ]);
  }

  for (const page of live.pages) {
    if (page.excerpt.length < 80) continue;
    intel.standout = [
      ...intel.standout,
      makeClaim({
        text: `From their public page: ${page.excerpt.slice(0, 320)}`,
        sourceUrl: page.url,
        sourceLabel: page.title || hostOf(page.url),
        fetchedAt: page.fetchedAt,
        confidence: "medium",
        inference: false,
        origin: "live",
      }),
    ];
    intel.sources = uniqueSources([
      ...intel.sources,
      { url: page.url, label: page.title || hostOf(page.url), fetchedAt: page.fetchedAt, origin: "live" },
    ]);
  }

  return intel;
}

export function inferPersonality(input: {
  name: string;
  title: string;
  bio: string;
  sessionTitle: string | null;
  sourceUrl: string;
  sourceLabel: string;
  fetchedAt: string;
  origin: Origin;
  sourceCount: number;
}): PersonalityRead {
  const first = input.name.split(" ")[0] || input.name;
  const long = input.bio.length > 280;
  const session = input.sessionTitle
    ? `${first} is on the schedule for ${input.sessionTitle}.`
    : `${first} is on the GitHub Universe schedule.`;
  const prose = long
    ? "The public bio is long enough to quote, so use their words instead of a character sketch."
    : "The public bio is short, so keep the read thin.";
  const confidence: Confidence =
    input.sourceCount >= 3 && long ? "high" : input.bio.length > 80 ? "medium" : "low";
  const topic = input.sessionTitle || input.title || "their work";
  return {
    summary: sanitizeCopy(`${session} ${prose}`),
    communication: sanitizeCopy(
      `Ask one specific question about ${topic}. A short, concrete opener fits this public record better than a broad pitch.`,
    ),
    confidence,
    sourceUrl: input.sourceUrl,
    sourceLabel: input.sourceLabel,
    fetchedAt: input.fetchedAt,
    origin: input.origin,
    label: DIAGNOSIS,
  };
}

function bit(name: string, state: FetchState, reason: string): string {
  if (state === "live") return `${name} came back`;
  if (state === "skipped") return `${name} was not requested`;
  return reason ? `${name} did not come back (${reason})` : `${name} did not come back`;
}

function workFromCatalog(input: SnapshotInput, bio: string, catalog: string, fetchedAt: string): Claim[] {
  const claims: Claim[] = [];
  const titleLine = [input.title, input.company].filter(Boolean).join(", ");
  if (titleLine) {
    claims.push(
      makeClaim({
        text: `Speaker catalog: ${titleLine}.`,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "high",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  for (const sentence of sentences(bio)) {
    if (!ROLE.test(sentence)) continue;
    claims.push(
      makeClaim({
        text: sentence,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "medium",
        inference: false,
        origin: "snapshot",
      }),
    );
    if (claims.length >= 4) break;
  }
  return claims;
}

function newsFromSources(input: SnapshotInput, fetchedAt: string): Claim[] {
  const claims: Claim[] = [];
  for (const source of input.sources) {
    if (!source.url || isCatalogSource(source.url, input.catalogUrl)) continue;
    const title = sanitizeCopy(source.title || hostOf(source.url));
    const dated = source.date ? `${title} (${source.date}).` : `${title}.`;
    claims.push(
      makeClaim({
        text: dated,
        sourceUrl: source.url,
        sourceLabel: title,
        fetchedAt,
        confidence: "medium",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  return claims.slice(0, 4);
}

function talkingFromCatalog(input: SnapshotInput, catalog: string, fetchedAt: string): Claim[] {
  const claims: Claim[] = [];
  if (input.sessionTitle) {
    claims.push(
      makeClaim({
        text: `They are scheduled for ${input.sessionTitle}.`,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "high",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  for (const topic of input.topics.slice(0, 3)) {
    claims.push(
      makeClaim({
        text: `Public topic on the schedule: ${topic}.`,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "high",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  const abstract = leadSentences(input.sessionAbstract, 220);
  if (abstract) {
    claims.push(
      makeClaim({
        text: abstract,
        sourceUrl: catalog,
        sourceLabel: "Session abstract",
        fetchedAt,
        confidence: "high",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  return claims;
}

function psychographicsFrom(input: SnapshotInput, bio: string, catalog: string, fetchedAt: string): Claim[] {
  const claims: Claim[] = [];
  if (input.topics.length) {
    claims.push(
      makeClaim({
        text: `They chose to talk about ${humanList(input.topics.slice(0, 3))} at this event.`,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "high",
        inference: false,
        origin: "snapshot",
      }),
    );
  }
  const words = emphasisWords(`${bio} ${input.topics.join(" ")}`);
  if (words.length) {
    claims.push(
      makeClaim({
        text: `Their public materials emphasize ${humanList(words.slice(0, 3))}.`,
        sourceUrl: catalog,
        sourceLabel: "GitHub Universe speaker catalog",
        fetchedAt,
        confidence: "low",
        inference: true,
        origin: "snapshot",
      }),
    );
  }
  return claims;
}

function bestSentence(bio: string): string {
  const parts = sentences(bio);
  if (!parts.length) return "";
  let best = parts[0];
  let bestScore = scoreSentence(best);
  for (const part of parts.slice(1)) {
    const score = scoreSentence(part);
    if (score > bestScore) {
      best = part;
      bestScore = score;
    }
  }
  return best;
}

function scoreSentence(sentence: string): number {
  let score = sentence.length > 80 ? 1 : 0;
  if (/\b(author|award|first|book|board|collection|founded)\b/i.test(sentence)) score += 2;
  return score;
}

function fallbackStandout(input: SnapshotInput): string {
  if (input.title && input.company) return `${input.name} is listed as ${input.title} at ${input.company}.`;
  if (input.title) return `${input.name} is listed as ${input.title}.`;
  return `${input.name} is on the GitHub Universe schedule.`;
}

function jobLine(job: LinkedInJob): string {
  const role = [job.title, job.company].filter(Boolean).join(" at ");
  return job.when ? `${role} (${job.when}).` : `${role}.`;
}

function sentences(bio: string): string[] {
  return bio
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function emphasisWords(text: string): string[] {
  const found: string[] = [];
  for (const word of EMPHASIS) {
    const re = new RegExp(`(?:^|[^a-z0-9])${word}(?=$|[^a-z0-9])`, "i");
    if (re.test(text)) found.push(word);
  }
  return found;
}

function isCatalogSource(url: string, catalogUrl: string): boolean {
  if (!url) return true;
  if (catalogUrl && url === catalogUrl) return true;
  return /githubuniverse\.com/i.test(url);
}

function makeClaim(claim: Claim): Claim {
  return { ...claim, text: sanitizeCopy(claim.text).slice(0, 420) };
}

function hitsFromJson(value: unknown): SerpHit[] {
  if (typeof value === "string") {
    try {
      return hitsFromJson(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    if (value.length && isHitLike(value[0])) return value.flatMap((item) => hitFromItem(item, "organic"));
    return value.flatMap((item) => hitsFromJson(item));
  }
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  if (typeof root.error === "string" && root.organic == null && root.news == null) return [];
  const hits: SerpHit[] = [];
  for (const key of ["organic", "organic_results", "results"]) collectArray(root[key], "organic", hits);
  for (const key of ["news", "news_results", "top_stories"]) collectArray(root[key], "news", hits);
  return hits;
}

function collectArray(value: unknown, kind: "organic" | "news", hits: SerpHit[]): void {
  if (!Array.isArray(value)) return;
  for (const item of value) hits.push(...hitFromItem(item, kind));
}

function isHitLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.link === "string" || typeof row.url === "string" || typeof row.title === "string";
}

function hitFromItem(item: unknown, kind: "organic" | "news"): SerpHit[] {
  if (!item || typeof item !== "object") return [];
  const row = item as Record<string, unknown>;
  const url = stringField(row, ["link", "url", "href"]);
  if (!url.startsWith("http") || isBlockedPublicUrl(url)) return [];
  const title = sanitizeCopy(stringField(row, ["title", "name"]) || hostOf(url)).slice(0, 180);
  const snippet = sanitizeCopy(stringField(row, ["description", "snippet", "snippet_text"])).slice(0, 280);
  const date = stringField(row, ["date", "published"]);
  if (!title && !snippet) return [];
  return [{ url, title: title || hostOf(url), snippet, kind, date }];
}

function parseSerpHtml(html: string): SerpHit[] {
  const hits: SerpHit[] = [];
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && hits.length < 8) {
    const url = cleanHref(match[1]);
    if (!url || isBlockedPublicUrl(url)) continue;
    const title = sanitizeCopy(stripTags(match[2])).slice(0, 180);
    if (title.length < 8) continue;
    hits.push({ url, title, snippet: "", kind: "organic", date: "" });
  }
  return hits;
}

function cleanHref(href: string): string | null {
  let value = href.replace(/&amp;/g, "&");
  if (value.startsWith("/url?")) {
    try {
      const query = new URL(value, "https://www.google.com").searchParams.get("q");
      if (!query || !query.startsWith("http")) return null;
      value = query;
    } catch {
      return null;
    }
  }
  if (!value.startsWith("http")) return null;
  return value.split("#")[0];
}

function dedupeHits(hits: SerpHit[]): SerpHit[] {
  const seen = new Set<string>();
  const out: SerpHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    out.push(hit);
  }
  return out.slice(0, 8);
}

function firstProfile(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstProfile(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.data)) return firstProfile(record.data);
  if (typeof record.name === "string" || typeof record.snapshot_id === "string") return record;
  return null;
}

function readExperience(value: unknown): LinkedInJob[] {
  if (!Array.isArray(value)) return [];
  const jobs: LinkedInJob[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (Array.isArray(row.positions)) {
      const company = stringField(row, ["company", "company_name", "subtitle"]);
      for (const pos of row.positions) {
        if (!pos || typeof pos !== "object") continue;
        const job = pos as Record<string, unknown>;
        const title = stringField(job, ["title", "position"]);
        const jobCompany = stringField(job, ["company", "company_name"]) || company;
        if (!title && !jobCompany) continue;
        jobs.push({ title, company: jobCompany, when: whenOf(job) });
      }
      continue;
    }
    const title = stringField(row, ["title", "position"]);
    const company = stringField(row, ["company", "company_name", "subtitle"]);
    if (!title && !company) continue;
    jobs.push({ title, company, when: whenOf(row) });
  }
  return jobs.slice(0, 8);
}

function readEducation(value: unknown): LinkedInSchool[] {
  if (!Array.isArray(value)) return [];
  const schools: LinkedInSchool[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const school = stringField(row, ["school", "title", "institution"]);
    const detail = [stringField(row, ["degree", "subtitle", "field"]), whenOf(row)].filter(Boolean).join(", ");
    if (!school && !detail) continue;
    schools.push({ school: school || detail, detail: school ? detail : "" });
  }
  return schools.slice(0, 6);
}

function whenOf(row: Record<string, unknown>): string {
  const start = stringField(row, ["start_date", "start", "start_year"]);
  const end = stringField(row, ["end_date", "end", "end_year"]);
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

function stringField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function uniqueSources(
  sources: { url: string; label: string; fetchedAt: string; origin: Origin }[],
): { url: string; label: string; fetchedAt: string; origin: Origin }[] {
  const seen = new Set<string>();
  const out: { url: string; label: string; fetchedAt: string; origin: Origin }[] = [];
  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    out.push(source);
  }
  return out;
}
