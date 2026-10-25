import { HERO_CYPHER, getCatalog, DEFAULT_INTERESTS } from "./catalog";
import { parseTalkTopics } from "./talk-topics";
import { getDb, graphName, noteQueryFailure } from "./falkor";
import type { HopInfo } from "./rank";
import { personCard, rankPeople } from "./rank";
import { logBackend, safeError } from "./redact";
import type { GraphBackend, MeetResponse, RankedPerson, RecommendQuery } from "./types";

/** Give a warm graph a moment. A cold connection must not hold the page. */
const GRAPH_BUDGET_MS = 250;

export function recommendFromMemory(query: RecommendQuery): MeetResponse {
  return finishRecommend(query, null, "memory", performance.now());
}

export async function recommend(query: RecommendQuery): Promise<MeetResponse> {
  const started = performance.now();
  let hops: Map<string, HopInfo> | null = null;
  let backend: GraphBackend = "memory";
  if (process.env.FALKORDB_URL) {
    try {
      const queried = await withBudget(readHops(query), GRAPH_BUDGET_MS);
      if (queried) {
        const linked = [...queried.values()].some((hop) => hop.sharedSessionIds.length > 0);
        if (linked) {
          hops = queried;
          backend = "falkordb";
          logBackend("falkordb", "ranking from multi-hop query");
        } else {
          logBackend("memory", "graph query returned no topic paths");
        }
      }
    } catch (err) {
      noteQueryFailure(err);
      logBackend("memory", `query failed: ${safeError(err)}`);
    }
  }

  return finishRecommend(query, hops, backend, started);
}

function finishRecommend(
  query: RecommendQuery,
  hops: Map<string, HopInfo> | null,
  backend: GraphBackend,
  started: number,
): MeetResponse {
  const catalog = getCatalog();
  const people = rankPeople(catalog, hops, normalize(query));
  return {
    backend,
    ms: Math.max(1, Math.round(performance.now() - started)),
    speakerCount: catalog.speakerCount,
    sessionCount: catalog.sessionCount,
    fetchedLabel: catalog.fetchedLabel,
    cypher: HERO_CYPHER,
    people,
  };
}

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function describePerson(
  id: string,
): Promise<{ card: RankedPerson; backend: GraphBackend; ms: number } | null> {
  const catalog = getCatalog();
  const started = performance.now();
  let hops: Map<string, HopInfo> | null = null;
  if (process.env.FALKORDB_URL) {
    try {
      const queried = await withBudget(readHops({ day: "both", metIds: [], limit: 1 }), GRAPH_BUDGET_MS);
      if (queried?.has(id)) hops = queried;
    } catch (err) {
      noteQueryFailure(err);
      logBackend("memory", `query failed: ${safeError(err)}`);
    }
  }
  const card = personCard(catalog, id, hops, { day: "both", metIds: [], limit: 1 });
  if (!card) return null;
  return {
    card,
    backend: hops ? "falkordb" : "memory",
    ms: Math.max(1, Math.round(performance.now() - started)),
  };
}

async function readHops(query: RecommendQuery): Promise<Map<string, HopInfo> | null> {
  const db = await getDb();
  if (!db) return null;
  const graph = db.selectGraph(graphName());
  const interests = query.interests?.length ? query.interests : [...DEFAULT_INTERESTS];
  const met = query.metIds.length ? query.metIds : ["__none__"];
  const reply = await graph.roQuery<Record<string, unknown>>(HERO_CYPHER, {
    params: { met, interests },
  });
  const hops = new Map<string, HopInfo>();
  for (const row of reply.data ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    hops.set(id, {
      sharedSessionIds: stringList(row.sharedSessionIds),
      introIds: stringList(row.introIds),
    });
  }
  return hops;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalize(query: RecommendQuery): RecommendQuery {
  return {
    day: query.day,
    metIds: query.metIds,
    interests: query.interests?.length ? query.interests : [...DEFAULT_INTERESTS],
    talkTopics: parseTalkTopics(query.talkTopics ?? []),
    limit: query.limit ?? 10,
  };
}
