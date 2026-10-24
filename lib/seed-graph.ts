import fs from "fs";
import path from "path";
import { DEFAULT_INTERESTS, getCatalog, memoryGraphCounts } from "./catalog";
import { getDb, graphName } from "./falkor";
import { logBackend, safeError } from "./redact";
import type { GraphBackend } from "./types";

const CATALOG_VERSION = 1;
const CYPHER_VERSION = 1;

export interface SeedStatus {
  ok: boolean;
  backend: GraphBackend;
  nodes: number;
  edges: number;
  seeded: boolean;
  already: boolean;
}

interface CypherGraph {
  query(query: string, options?: { params?: Record<string, unknown> }): Promise<{ data?: unknown[] }>;
  roQuery(query: string, options?: { params?: Record<string, unknown> }): Promise<{ data?: unknown[] }>;
}

let catalogTask: Promise<SeedStatus> | null = null;
let cypherTask: Promise<SeedStatus> | null = null;

export function ensureCatalog(): Promise<SeedStatus> {
  if (!catalogTask) {
    catalogTask = runCatalog().catch((err: unknown) => {
      catalogTask = null;
      logBackend("memory", `catalog seed failed: ${safeError(err)}`);
      return memoryStatus();
    });
  }
  return catalogTask;
}

export function ensureCypher(): Promise<SeedStatus> {
  if (!cypherTask) {
    cypherTask = ensureCatalog()
      .then((status) => (status.backend === "falkordb" ? runCypher(status) : status))
      .catch((err: unknown) => {
        cypherTask = null;
        logBackend("falkordb", `cypher seed failed: ${safeError(err)}`);
        return ensureCatalog();
      });
  }
  return cypherTask;
}

export function splitCypher(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .map((line) => line.replace(/;+\s*$/, ""));
}

async function runCatalog(): Promise<SeedStatus> {
  if (!process.env.FALKORDB_URL) {
    logBackend("memory", "FALKORDB_URL unset");
    return memoryStatus();
  }
  const db = await getDb();
  if (!db) return memoryStatus();
  const graph = db.selectGraph(graphName()) as unknown as CypherGraph;
  const marker = await readMarker(graph);
  const sessions = marker.catalog >= CATALOG_VERSION ? await countLabel(graph, "Session") : 0;
  if (marker.catalog >= CATALOG_VERSION && sessions >= 100) {
    logBackend("falkordb", "catalog already loaded");
    const counts = await falkorCounts(graph);
    return { ok: true, backend: "falkordb", ...counts, seeded: true, already: true };
  }
  await loadCatalog(graph);
  await graph.query(
    "MERGE (s:Seed {id:'gu-2026'}) SET s.catalog = $version, s.catalog_at = $at",
    { params: { version: CATALOG_VERSION, at: new Date().toISOString() } },
  );
  logBackend("falkordb", "catalog loaded");
  const counts = await falkorCounts(graph);
  return { ok: true, backend: "falkordb", ...counts, seeded: true, already: false };
}

async function runCypher(status: SeedStatus): Promise<SeedStatus> {
  const db = await getDb();
  if (!db) return status;
  const graph = db.selectGraph(graphName()) as unknown as CypherGraph;
  const marker = await readMarker(graph);
  if (marker.cypher >= CYPHER_VERSION) {
    logBackend("falkordb", "seed.cypher already loaded");
    return { ...status, already: true };
  }
  const file = path.join(process.cwd(), "seed", "github-universe-demo", "seed.cypher");
  const statements = splitCypher(fs.readFileSync(file, "utf8"));
  let failed = 0;
  for (const statement of statements) {
    try {
      await graph.query(statement);
    } catch (err) {
      failed += 1;
      if (failed <= 3) logBackend("falkordb", `seed.cypher statement skipped: ${safeError(err)}`);
    }
  }
  if (failed > 25) {
    logBackend("falkordb", `seed.cypher left unfinished, ${failed} statements failed`);
    return status;
  }
  await graph.query(
    "MERGE (s:Seed {id:'gu-2026'}) SET s.cypher = $version, s.cypher_at = $at",
    { params: { version: CYPHER_VERSION, at: new Date().toISOString() } },
  );
  logBackend("falkordb", `seed.cypher loaded, skipped ${failed}`);
  const counts = await falkorCounts(graph);
  return { ok: true, backend: "falkordb", ...counts, seeded: true, already: false };
}

async function loadCatalog(graph: CypherGraph): Promise<void> {
  const catalog = getCatalog();
  const at = catalog.fetchedAt || new Date().toISOString();
  await graph.query(
    `MERGE (e:Event {id:'github-universe-2026'})
     SET e.name = 'GitHub Universe 2026', e.start = '2026-10-28', e.end = '2026-10-29',
         e.venue = 'Fort Mason Center, San Francisco', e.fetched_at = $at`,
    { params: { at } },
  );
  await graph.query(
    `MERGE (me:Person {id:'me'})
     SET me.name = 'Henry Finn'
     WITH me
     UNWIND $topics AS name
     MERGE (t:Topic {name: name})
     MERGE (me)-[:INTERESTED_IN]->(t)`,
    { params: { topics: [...DEFAULT_INTERESTS] } },
  );
  await unwind(
    graph,
    `UNWIND $rows AS row
     MERGE (p:Person {id: row.id})
     SET p.name = row.name, p.title = row.title, p.company = row.company,
         p.bio = row.bio, p.photo_url = row.photo, p.linkedin_url = row.linkedin,
         p.fetched_at = row.fetchedAt`,
    catalog.people.map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      company: person.company,
      bio: person.bio.slice(0, 2500),
      photo: person.photoUrl,
      linkedin: person.linkedinUrl ?? "",
      fetchedAt: at,
    })),
    20,
  );
  await unwind(
    graph,
    `UNWIND $rows AS row
     MERGE (c:Company {name: row.company})
     WITH c, row
     MATCH (p:Person {id: row.id})
     MERGE (p)-[:WORKS_AT]->(c)`,
    catalog.people.filter((person) => person.company).map((person) => ({
      id: person.id,
      company: person.company,
    })),
    40,
  );
  await unwind(
    graph,
    `UNWIND $rows AS row
     MERGE (s:Session {id: row.id})
     SET s.title = row.title, s.type = row.type, s.date = row.date, s.day = row.day,
         s.start = row.start, s.room = row.room, s.level = row.level
     WITH s
     MATCH (e:Event {id:'github-universe-2026'})
     MERGE (s)-[:AT]->(e)`,
    catalog.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      type: session.type,
      date: session.date,
      day: session.dayName,
      start: session.startLabel,
      room: session.room,
      level: session.level,
    })),
    30,
  );
  const about = catalog.sessions.flatMap((session) =>
    session.topics.map((topic) => ({ sessionId: session.id, topic })),
  );
  await unwind(
    graph,
    `UNWIND $rows AS row
     MATCH (s:Session {id: row.sessionId})
     MERGE (t:Topic {name: row.topic})
     MERGE (s)-[:ABOUT]->(t)`,
    about,
    80,
  );
  const presents = catalog.sessions.flatMap((session) =>
    session.presenterIds.map((personId) => ({ personId, sessionId: session.id })),
  );
  await unwind(
    graph,
    `UNWIND $rows AS row
     MATCH (p:Person {id: row.personId})
     MATCH (s:Session {id: row.sessionId})
     MERGE (p)-[:PRESENTS]->(s)`,
    presents,
    80,
  );
}

async function unwind(
  graph: CypherGraph,
  cypher: string,
  rows: Record<string, string>[],
  size: number,
): Promise<void> {
  let failed = 0;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    try {
      await graph.query(cypher, { params: { rows: batch } });
    } catch (err) {
      failed += 1;
      if (failed === 1) logBackend("falkordb", `a seed batch failed: ${safeError(err)}`);
      for (const row of batch) {
        try {
          await graph.query(cypher, { params: { rows: [row] } });
        } catch {
          failed += 1;
        }
      }
    }
  }
}

async function readMarker(graph: CypherGraph): Promise<{ catalog: number; cypher: number }> {
  try {
    const reply = await graph.roQuery(
      "MATCH (s:Seed {id:'gu-2026'}) RETURN s.catalog AS catalog, s.cypher AS cypher",
    );
    const row = asRows(reply)[0];
    return { catalog: num(row?.catalog), cypher: num(row?.cypher) };
  } catch {
    return { catalog: 0, cypher: 0 };
  }
}

async function countLabel(graph: CypherGraph, label: "Session" | "Person"): Promise<number> {
  const reply = await graph.roQuery(`MATCH (n:${label}) RETURN count(n) AS c`);
  return num(asRows(reply)[0]?.c);
}

export async function falkorCounts(graph: CypherGraph): Promise<{ nodes: number; edges: number }> {
  const nodes = await graph.roQuery("MATCH (n) RETURN count(n) AS c");
  const edges = await graph.roQuery("MATCH ()-[r]->() RETURN count(r) AS c");
  return { nodes: num(asRows(nodes)[0]?.c), edges: num(asRows(edges)[0]?.c) };
}

export async function liveCounts(): Promise<{ backend: GraphBackend; nodes: number; edges: number }> {
  const status = await ensureCypher();
  if (status.backend === "falkordb") {
    const db = await getDb();
    if (db) {
      try {
        const counts = await falkorCounts(db.selectGraph(graphName()) as unknown as CypherGraph);
        return { backend: "falkordb", ...counts };
      } catch (err) {
        logBackend("memory", `count failed: ${safeError(err)}`);
      }
    }
  }
  const counts = memoryGraphCounts(getCatalog());
  return { backend: "memory", ...counts };
}

function memoryStatus(): SeedStatus {
  const counts = memoryGraphCounts(getCatalog());
  return { ok: true, backend: "memory", ...counts, seeded: false, already: false };
}

function asRows(reply: { data?: unknown[] }): Record<string, unknown>[] {
  if (!Array.isArray(reply.data)) return [];
  return reply.data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(n) ? n : 0;
}
