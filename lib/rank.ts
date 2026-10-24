import {
  DEFAULT_INTERESTS,
  matchesDay,
  type Catalog,
  type PersonNode,
  type SessionNode,
} from "./catalog";
import { sanitizeCopy } from "./sanitize";
import { isDistinctive, wholeWordHits } from "./terms";
import { humanList, leadSentences, shortTitle, startMinutes } from "./text";
import type { DayFilter, IntroVia, PathChip, RankedPerson, RecommendQuery, SourceRef } from "./types";

const TYPE_ORDER: Record<string, number> = {
  Keynote: 0,
  "Main Stage": 1,
  "Panel Discussion": 2,
  "Breakout Session": 3,
  Workshop: 4,
  "Ship & Tell": 5,
  "Sandbox Session": 6,
  "Product Demo": 7,
  "Special Event": 8,
};

export interface HopInfo {
  sharedSessionIds: string[];
  introIds: string[];
}

interface Draft {
  person: PersonNode;
  session: SessionNode | null;
  sharedTopics: string[];
  keywordHits: string[];
  base: number;
  coIds: string[];
  intro: IntroVia | null;
  score: number;
}

export function memoryHops(catalog: Catalog, interests: string[]): Map<string, HopInfo> {
  const wanted = new Set(interests);
  const hops = new Map<string, HopInfo>();
  for (const person of catalog.people) {
    const sharedSessionIds: string[] = [];
    const introIds = new Set<string>();
    for (const sid of person.sessionIds) {
      const session = catalog.sessionsById.get(sid);
      if (!session || session.skip) continue;
      if (session.topics.some((topic) => wanted.has(topic))) sharedSessionIds.push(sid);
      for (const other of session.presenterIds) {
        if (other !== person.id) introIds.add(other);
      }
    }
    hops.set(person.id, { sharedSessionIds, introIds: [...introIds] });
  }
  return hops;
}

export function rankPeople(
  catalog: Catalog,
  hops: Map<string, HopInfo> | null,
  query: RecommendQuery,
): RankedPerson[] {
  const interests = query.interests?.length ? query.interests : [...DEFAULT_INTERESTS];
  const hopMap = hops ?? memoryHops(catalog, interests);
  const met = new Set(query.metIds);
  const drafts = buildDrafts(catalog, hopMap, interests, query.day, met);
  const limit = query.limit ?? 10;
  return drafts.slice(0, limit).map((draft) => toCard(catalog, draft, interests));
}

export function personCard(
  catalog: Catalog,
  id: string,
  hops: Map<string, HopInfo> | null,
  query: RecommendQuery,
): RankedPerson | null {
  const person = catalog.peopleById.get(id);
  if (!person) return null;
  const interests = query.interests?.length ? query.interests : [...DEFAULT_INTERESTS];
  const hopMap = hops ?? memoryHops(catalog, interests);
  const drafts = buildDrafts(catalog, hopMap, interests, query.day, new Set(), true);
  const draft = drafts.find((item) => item.person.id === id);
  if (!draft) return null;
  return toCard(catalog, draft, interests);
}

function buildDrafts(
  catalog: Catalog,
  hops: Map<string, HopInfo>,
  interests: string[],
  day: DayFilter,
  met: Set<string>,
  keepLow = false,
): Draft[] {
  const wanted = new Set(interests);
  const drafts: Draft[] = [];
  for (const person of catalog.people) {
    if (met.has(person.id)) continue;
    const hop = hops.get(person.id) ?? { sharedSessionIds: [], introIds: [] };
    const sharedSet = new Set(hop.sharedSessionIds);
    const daySessions = person.sessionIds
      .map((sid) => catalog.sessionsById.get(sid))
      .filter((session): session is SessionNode => !!session && matchesDay(session, day));
    if (day !== "both" && daySessions.length === 0) continue;
    const sharedSessions = daySessions.filter((session) => sharedSet.has(session.id));
    const chosen = pickSession(sharedSessions.length ? sharedSessions : daySessions, wanted);
    const sharedTopics =
      sharedSessions.length && chosen ? chosen.topics.filter((topic) => wanted.has(topic)) : [];
    const keywordHits = wholeWordHits(`${person.bio} ${person.title}`);
    const distinctive = keywordHits.filter(isDistinctive);
    if (!keepLow && sharedTopics.length === 0 && distinctive.length === 0) continue;
    let base = Math.min(sharedTopics.length, 4) * 3;
    for (const hit of keywordHits) base += hit === "ai" ? 2 : 8;
    if (chosen && chosen.audience.some((item) => item.toLowerCase().includes("startup"))) base += 1;
    if (chosen && (chosen.type === "Main Stage" || chosen.type === "Keynote")) base += 1;
    const onStage = new Set((chosen?.presenterIds ?? []).filter((pid) => pid !== person.id));
    const fromGraph = hop.introIds.filter((pid) => onStage.has(pid));
    const coIds = fromGraph.length ? fromGraph : [...onStage];
    drafts.push({
      person,
      session: chosen,
      sharedTopics,
      keywordHits,
      base,
      coIds,
      intro: null,
      score: base,
    });
  }

  const byId = new Map(drafts.map((draft) => [draft.person.id, draft]));
  for (const draft of drafts) {
    const introId = [...draft.coIds].sort((a, b) => {
      const aScore = byId.get(a)?.base ?? 0;
      const bScore = byId.get(b)?.base ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      const aName = catalog.peopleById.get(a)?.name ?? a;
      const bName = catalog.peopleById.get(b)?.name ?? b;
      return aName.localeCompare(bName);
    })[0];
    if (introId) {
      const introPerson = catalog.peopleById.get(introId);
      if (introPerson) draft.intro = { id: introPerson.id, name: introPerson.name };
    }
    draft.score = draft.base + (draft.intro ? 2 : 0);
  }

  drafts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aHits = a.keywordHits.filter(isDistinctive).length;
    const bHits = b.keywordHits.filter(isDistinctive).length;
    if (bHits !== aHits) return bHits - aHits;
    return a.person.name.localeCompare(b.person.name);
  });
  return drafts;
}

function pickSession(sessions: SessionNode[], wanted: Set<string>): SessionNode | null {
  if (!sessions.length) return null;
  const ranked = [...sessions].sort((a, b) => {
    const sharedA = a.topics.filter((topic) => wanted.has(topic)).length;
    const sharedB = b.topics.filter((topic) => wanted.has(topic)).length;
    if (sharedB !== sharedA) return sharedB - sharedA;
    const typeA = TYPE_ORDER[a.type] ?? 9;
    const typeB = TYPE_ORDER[b.type] ?? 9;
    if (typeA !== typeB) return typeA - typeB;
    return startMinutes(a.startLabel) - startMinutes(b.startLabel);
  });
  return ranked[0];
}

function toCard(catalog: Catalog, draft: Draft, interests: string[]): RankedPerson {
  const { person, session } = draft;
  const topic =
    draft.sharedTopics.find((name) => interests.includes(name)) ?? draft.sharedTopics[0] ?? null;
  const path = buildPath(person.name, session?.title ?? null, topic, draft.keywordHits);
  const hops = path.filter((chip) => chip.kind === "edge").length;
  const introPath = draft.intro
    ? [
        { kind: "node" as const, text: draft.intro.name, tone: "plain" as const },
        { kind: "edge" as const, text: "CO_PRESENTS", tone: "plain" as const },
        { kind: "node" as const, text: person.name, tone: "solid" as const },
      ]
    : [];
  const dayLabel = session ? dayLabelOf(session.dayKey) : "";
  const catchLine = session
    ? `${session.roomShort}, ${dayLabel} ${session.startLabel}`.replace(/\s+/g, " ").trim()
    : "Time to be confirmed";
  const sources: SourceRef[] = [
    { label: "GitHub Universe speaker catalog", url: catalog.catalogUrl },
    ...person.articles.slice(0, 2),
  ];
  if (person.linkedinUrl) sources.push({ label: "LinkedIn", url: person.linkedinUrl });

  return {
    id: person.id,
    name: person.name,
    title: person.title,
    company: person.company,
    titleLine: titleLine(person.title, person.company),
    photoUrl: person.photoUrl,
    linkedinUrl: person.linkedinUrl,
    score: draft.score,
    why: whyParagraph(person, draft, session),
    opener: openerLine(person.name, session?.title ?? null, draft.sharedTopics, draft.keywordHits),
    catchLine,
    sessionTitle: session?.title ?? null,
    sessionType: session?.type ?? null,
    roomShort: session?.roomShort ?? "",
    dayKey: session?.dayKey ?? "other",
    dayLabel,
    startLabel: session?.startLabel ?? "",
    sharedTopics: draft.sharedTopics,
    keywordHits: draft.keywordHits,
    introVia: draft.intro,
    path,
    introPath,
    hops,
    sources,
    bio: person.bio,
  };
}

function titleLine(title: string, company: string): string {
  if (!title) return company;
  if (!company) return title;
  if (title.toLowerCase().includes(company.toLowerCase())) return title;
  return `${title}, ${company}`;
}

function dayLabelOf(day: "wed" | "thu" | "other"): string {
  if (day === "wed") return "Wed";
  if (day === "thu") return "Thu";
  return "";
}

function buildPath(
  name: string,
  sessionTitle: string | null,
  topic: string | null,
  hits: string[],
): PathChip[] {
  if (topic && sessionTitle) {
    return [
      { kind: "node", text: "You", tone: "solid" },
      { kind: "edge", text: "INTERESTED_IN", tone: "plain" },
      { kind: "node", text: topic, tone: "plain" },
      { kind: "edge", text: "ABOUT", tone: "plain" },
      { kind: "node", text: shortTitle(sessionTitle, 42), tone: "plain" },
      { kind: "edge", text: "PRESENTS", tone: "plain" },
      { kind: "node", text: name, tone: "solid" },
    ];
  }
  const term = hits.find(isDistinctive) ?? hits[0];
  const chips: PathChip[] = [
    {
      kind: "note",
      text: term ? `Keyword match: ${term}` : "Keyword match",
      tone: "plain",
    },
    { kind: "node", text: name, tone: "solid" },
  ];
  if (sessionTitle) {
    chips.push(
      { kind: "edge", text: "PRESENTS", tone: "plain" },
      { kind: "node", text: shortTitle(sessionTitle, 42), tone: "plain" },
    );
  }
  return chips;
}

function whyParagraph(person: PersonNode, draft: Draft, session: SessionNode | null): string {
  const first = person.name.split(" ")[0];
  const lead = leadSentences(person.bio);
  const topics = humanList(draft.sharedTopics.slice(0, 3));
  const hits = draft.keywordHits.filter(isDistinctive);
  const sentences: string[] = [];
  if (lead) sentences.push(lead);
  else sentences.push(`${person.name} is on the GitHub Universe schedule.`);
  if (topics && session) {
    sentences.push(`You share ${topics}, and that shows up in ${session.title}.`);
  } else if (topics) {
    sentences.push(`You share ${topics}.`);
  }
  if (hits.length) {
    sentences.push(
      `${first}'s public bio names ${humanList(hits)}, which is the part of your own story you can say out loud.`,
    );
  }
  if (draft.intro) {
    sentences.push(
      `If walking up cold is too much, ${draft.intro.name} is on the same session and can make the intro.`,
    );
  }
  return sanitizeCopy(sentences.join(" "));
}

function openerLine(
  _name: string,
  sessionTitle: string | null,
  topics: string[],
  hits: string[],
): string {
  const topic = topics[0] || hits.find(isDistinctive) || "the work";
  const hook = sessionTitle
    ? `Your session, ${shortTitle(sessionTitle, 64)}, is why I came over`
    : "Your work is why I came over";
  return sanitizeCopy(
    `I direct films and build stories with AI. ${hook}. How are you thinking about ${topic} for people who are not engineers?`,
  );
}
