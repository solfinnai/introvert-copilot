import fs from "fs";
import path from "path";
import { sanitizeCopy, plainText } from "./sanitize";
import { clockLabel, slugify } from "./text";
import type { DayFilter, SourceRef } from "./types";

export const DEFAULT_INTERESTS = [
  "AI: Agents",
  "Developer experience (DX)",
  "AI: Models",
  "Open source",
  "Education",
  "Community and social impact",
] as const;

export const HERO_CYPHER = `MATCH (p:Person)
WHERE p.id <> 'me' AND NONE(x IN $met WHERE x = p.id)
OPTIONAL MATCH (p)-[:PRESENTS]->(s:Session)-[:ABOUT]->(t:Topic)<-[:INTERESTED_IN]-(:Person {id:'me'})
WHERE t.name IN $interests
WITH p, collect(DISTINCT s.id) AS sharedSessionIds
OPTIONAL MATCH (p)-[:PRESENTS]->(:Session)<-[:PRESENTS]-(co:Person)
WHERE co.id <> p.id AND co.id <> 'me'
RETURN p.id AS id, sharedSessionIds, collect(DISTINCT co.id) AS introIds`;

export interface SessionNode {
  id: string;
  title: string;
  type: string;
  date: string;
  dayName: string;
  dayKey: "wed" | "thu" | "other";
  startLabel: string;
  room: string;
  roomShort: string;
  topics: string[];
  audience: string[];
  level: string;
  skip: boolean;
  abstract: string;
  presenterIds: string[];
}

export interface PersonNode {
  id: string;
  name: string;
  title: string;
  company: string;
  photoUrl: string;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  bio: string;
  sessionIds: string[];
  articles: SourceRef[];
}

export interface Catalog {
  fetchedAt: string;
  fetchedLabel: string;
  catalogUrl: string;
  speakerCount: number;
  sessionCount: number;
  people: PersonNode[];
  sessions: SessionNode[];
  peopleById: Map<string, PersonNode>;
  sessionsById: Map<string, SessionNode>;
  topicNames: string[];
  companies: string[];
}

interface RawAttr {
  attribute?: string;
  value?: string;
}

let cached: Catalog | null = null;

export function getCatalog(): Catalog {
  if (!cached) cached = buildCatalog();
  return cached;
}

export function memoryGraphCounts(catalog: Catalog): { nodes: number; edges: number } {
  const companies = new Set(catalog.people.map((p) => p.company).filter(Boolean));
  const topics = new Set<string>(DEFAULT_INTERESTS);
  let about = 0;
  let presents = 0;
  for (const session of catalog.sessions) {
    about += session.topics.length;
    presents += session.presenterIds.length;
    for (const topic of session.topics) topics.add(topic);
  }
  const works = catalog.people.filter((person) => person.company).length;
  const nodes = 2 + catalog.people.length + catalog.sessions.length + topics.size + companies.size;
  const edges = presents + about + works + catalog.sessions.length + DEFAULT_INTERESTS.length;
  return { nodes, edges };
}

function buildCatalog(): Catalog {
  const root = process.cwd();
  const seedDir = path.join(root, "seed", "github-universe-demo");
  const event = readJson<{
    fetched_at?: string;
    speakers_url?: string;
    speaker_count_published?: number;
    session_count_published?: number;
  }>(path.join(seedDir, "event.json"));
  const speakers = readJson<RawSpeaker[]>(path.join(seedDir, "raw", "raw_speakers.json"));
  const sessions = readJson<RawSession[]>(path.join(seedDir, "raw", "raw_sessions.json"));
  const curated = readJson<CuratedPerson[]>(path.join(seedDir, "people.json"));

  const articles = new Map<string, SourceRef[]>();
  for (const person of curated) {
    const extra = (person.sources ?? []).slice(1).flatMap((source) => {
      const url = source.url?.trim();
      if (!url || url === "GAP") return [];
      return [{ label: source.title?.trim() || url, url }];
    });
    if (extra.length) articles.set(person.id, extra);
  }

  const sessionNodes = new Map<string, SessionNode>();
  for (const raw of sessions) {
    const id = raw.sessionID?.trim();
    if (!id) continue;
    const title = (raw.title ?? "").replace(/\s+/g, " ").trim();
    const type = (raw.type ?? "").trim();
    const time = raw.times?.[0] ?? {};
    const dayName = (time.dayName ?? "").trim();
    const date = (time.date ?? "").trim();
    const topics = attrValues(raw.attributevalues, "Topic");
    sessionNodes.set(id, {
      id,
      title,
      type,
      date,
      dayName,
      dayKey: dayKeyOf(dayName, date),
      startLabel: clockLabel(time.startTimeFormatted ?? ""),
      room: (time.room ?? "").trim(),
      roomShort: roomShort(time.room ?? ""),
      topics,
      audience: attrValues(raw.attributevalues, "Target audience"),
      level: attrValues(raw.attributevalues, "Level")[0] ?? "",
      skip: shouldSkip(title, type),
      abstract: plainText(raw.abstract ?? "").slice(0, 480),
      presenterIds: [],
    });
  }

  const people: PersonNode[] = [];
  for (const raw of speakers) {
    const name = (raw.fullName ?? "").trim();
    if (!name) continue;
    const id = slugify(name);
    const sessionIds: string[] = [];
    for (const link of raw.session ?? []) {
      const sid = link.sessionID?.trim();
      if (!sid || !sessionNodes.has(sid) || sessionIds.includes(sid)) continue;
      sessionIds.push(sid);
      sessionNodes.get(sid)!.presenterIds.push(id);
    }
    const company = cleanField(raw.companyName);
    const linkedin = cleanUrl(raw.linkedIn);
    people.push({
      id,
      name,
      title: cleanField(raw.jobTitle),
      company,
      photoUrl: cleanUrl(raw.photoURL) ?? "",
      linkedinUrl: linkedin,
      twitterHandle: cleanHandle(raw.twitter),
      bio: sanitizeCopy((raw.bio ?? "").replace(/\s+/g, " ")),
      sessionIds,
      articles: articles.get(id) ?? [],
    });
  }

  people.sort((a, b) => a.name.localeCompare(b.name));
  const topicNames = [...new Set([...sessionNodes.values()].flatMap((s) => s.topics))].sort();
  const companies = [...new Set(people.map((p) => p.company).filter(Boolean))].sort();

  return {
    fetchedAt: event.fetched_at ?? "",
    fetchedLabel: formatFetched(event.fetched_at ?? ""),
    catalogUrl: event.speakers_url ?? "https://githubuniverse.com/",
    speakerCount: event.speaker_count_published ?? people.length,
    sessionCount: event.session_count_published ?? sessionNodes.size,
    people,
    sessions: [...sessionNodes.values()],
    peopleById: new Map(people.map((p) => [p.id, p])),
    sessionsById: sessionNodes,
    topicNames,
    companies,
  };
}

export function matchesDay(session: SessionNode, day: DayFilter): boolean {
  if (session.skip) return false;
  if (day === "both") return true;
  return session.dayKey === day;
}

function dayKeyOf(dayName: string, date: string): "wed" | "thu" | "other" {
  if (dayName.startsWith("Wed") || date === "2026-10-28") return "wed";
  if (dayName.startsWith("Thu") || date === "2026-10-29") return "thu";
  return "other";
}

function roomShort(room: string): string {
  const clean = room.replace(/\s+/g, " ").trim();
  if (!clean) return "the venue";
  return clean.split(" @ ")[0].trim();
}

function shouldSkip(title: string, type: string): boolean {
  if (type === "Social") return true;
  if (/^(tech check|rehearsal|session after party)\b/i.test(title)) return true;
  return false;
}

function attrValues(list: RawAttr[] | undefined, name: string): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (item?.attribute !== name || !item.value) continue;
    const value = item.value.trim();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

function cleanField(value: string | undefined): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (!clean || clean === "GAP") return "";
  return clean;
}

function cleanUrl(value: string | undefined): string | null {
  const clean = (value ?? "").trim();
  if (!clean || clean === "GAP" || !/^https?:\/\//i.test(clean)) return null;
  return clean;
}

function cleanHandle(value: string | undefined): string | null {
  const clean = (value ?? "").trim().replace(/^@/, "");
  if (!clean || clean === "GAP") return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (!/^[A-Za-z0-9_]{2,40}$/.test(clean)) return null;
  return clean;
}

function formatFetched(iso: string): string {
  if (!iso) return "cached snapshot";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "cached snapshot";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    hour12: true,
  }).format(date);
  return `${time} PT`;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

interface RawSpeaker {
  fullName?: string;
  jobTitle?: string;
  companyName?: string;
  bio?: string;
  photoURL?: string;
  linkedIn?: string;
  twitter?: string;
  session?: { sessionID?: string }[];
}

interface RawSession {
  sessionID?: string;
  title?: string;
  type?: string;
  abstract?: string;
  times?: { date?: string; dayName?: string; startTimeFormatted?: string; room?: string }[];
  attributevalues?: RawAttr[];
}

interface CuratedPerson {
  id: string;
  sources?: { url?: string; title?: string }[];
}
