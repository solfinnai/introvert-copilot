import { HERO_CYPHER, getCatalog, DEFAULT_INTERESTS } from "./catalog";
import { getDb, graphName, noteQueryFailure } from "./falkor";
import type { HopInfo } from "./rank";
import { personCard, rankPeople } from "./rank";
import { logBackend, safeError } from "./redact";
import { ensureCatalog, ensureCypher } from "./seed-graph";
import type { GraphBackend, MeetResponse, RankedPerson, RecommendQuery } from "./types";

export async function recommend(query: RecommendQuery): Promise<MeetResponse> {
  const catalog = getCatalog();
  const status = await ensureCatalog();
  if (status.backend === "falkordb") scheduleCypher();
  const started = performance.now();

  let hops: Map<string, HopInfo> | null = null;
  let backend: GraphBackend = "memory";
  if (status.backend === "falkordb") {
    try {
      const queried = await queryHops(query);
      const linked = [...queried.values()].some((hop) => hop.sharedSessionIds.length > 0);
      if (linked) {
        hops = queried;
        backend = "falkordb";
        logBackend("falkordb", "ranking from multi-hop query");
      } else {
        logBackend("memory", "graph query returned no topic paths");
      }
    } catch (err) {
      noteQueryFailure(err);
      logBackend("memory", `query failed: ${safeError(err)}`);
    }
  }

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

export async function describePerson(
  id: string,
): Promise<{ card: RankedPerson; backend: GraphBackend; ms: number } | null> {
  const catalog = getCatalog();
  const status = await ensureCatalog();
  const started = performance.now();
  let hops: Map<string, HopInfo> | null = null;
  if (status.backend === "falkordb") {
    try {
      const queried = await queryHops({ day: "both", metIds: [], limit: 1 });
      if (queried.has(id)) hops = queried;
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

async function queryHops(query: RecommendQuery): Promise<Map<string, HopInfo>> {
  const db = await getDb();
  if (!db) return new Map();
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
    limit: query.limit ?? 10,
  };
}

function scheduleCypher(): void {
  const run = () => {
    void ensureCypher().catch(() => undefined);
  };
  try {
    // Loaded only when a request is in flight. The import is dynamic so
    // `npm run seed` does not need a request scope.
    void import("next/server")
      .then(({ after }) => {
        try {
          after(run);
        } catch {
          run();
        }
      })
      .catch(run);
  } catch {
    run();
  }
}
