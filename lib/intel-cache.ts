import { getDb, graphName, withTimeout } from "./falkor";
import { markCached, type PersonIntel } from "./intel";
import type { ConversationPlan } from "./plan";
import type { FetchReport } from "./intel";

export interface CachedBrief {
  version: 1;
  savedAt: string;
  intel: PersonIntel;
  plan: ConversationPlan;
  report: FetchReport;
}

const TTL_MS = 20 * 60 * 1000;
const memory = new Map<string, CachedBrief>();

export async function readBriefCache(id: string): Promise<CachedBrief | null> {
  if (!safeId(id)) return null;
  const local = fresh(memory.get(id));
  if (local) return present(local);
  try {
    const db = await withTimeout(getDb(), 2000, "cache connect timed out");
    if (!db) return null;
    const graph = db.selectGraph(graphName());
    const reply = await withTimeout(
      graph.roQuery<Record<string, unknown>>("MATCH (p:Person {id: $id}) RETURN p.brief_json AS brief", {
        params: { id },
      }),
      2000,
      "cache read timed out",
    );
    const raw = reply.data?.[0]?.brief;
    if (typeof raw !== "string" || !raw) return null;
    const parsed = JSON.parse(raw) as CachedBrief;
    const hit = fresh(parsed);
    if (!hit) return null;
    memory.set(id, hit);
    return present(hit);
  } catch {
    return null;
  }
}

export async function writeBriefCache(id: string, brief: CachedBrief): Promise<void> {
  if (!safeId(id)) return;
  if (brief.intel.mode === "snapshot" && brief.plan.mode === "template") return;
  memory.set(id, brief);
  try {
    const db = await withTimeout(getDb(), 2000, "cache connect timed out");
    if (!db) return;
    const graph = db.selectGraph(graphName());
    await withTimeout(
      graph.query("MATCH (p:Person {id: $id}) SET p.brief_json = $brief", {
        params: { id, brief: JSON.stringify(brief) },
      }),
      2000,
      "cache write timed out",
    );
  } catch {
    /* The page still renders if the graph cache is down. */
  }
}

function present(brief: CachedBrief): CachedBrief {
  return { ...brief, intel: markCached(brief.intel) };
}

function fresh(brief: CachedBrief | undefined | null): CachedBrief | null {
  if (!brief || brief.version !== 1 || !brief.intel || !brief.plan || !brief.savedAt) return null;
  if (brief.intel.mode === "snapshot" && brief.plan.mode === "template") return null;
  const saved = Date.parse(brief.savedAt);
  if (Number.isNaN(saved) || Date.now() - saved > TTL_MS) return null;
  return brief;
}

function safeId(id: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(id);
}
