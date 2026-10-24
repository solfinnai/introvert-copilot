import { getDb, graphName, withTimeout } from "./falkor";
import { markCached, type PersonIntel } from "./intel";
import type { ConversationPlan } from "./plan";
import type { FetchReport } from "./intel";
import type { PublicLink, SocialProfile } from "./public-links";

export const BRIEF_CACHE_VERSION = 5;
export const INTEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const INTEL_CACHE_SECONDS = INTEL_CACHE_TTL_MS / 1000;
export const INTEL_CACHE_CONTROL = `public, max-age=${INTEL_CACHE_SECONDS}, s-maxage=${INTEL_CACHE_SECONDS}`;

/** Remaining lifetime, so a five-hour-old brief is not advertised as fresh for six more hours. */
export function intelCacheControl(savedAt: string): string {
  const saved = Date.parse(savedAt);
  if (Number.isNaN(saved)) return "no-store";
  const seconds = Math.floor((INTEL_CACHE_TTL_MS - (Date.now() - saved)) / 1000);
  if (seconds < 1) return "no-store";
  return `public, max-age=${seconds}, s-maxage=${seconds}`;
}

const writes = new Map<string, "durable" | "memory" | "skipped">();

export function briefWriteResult(id: string): "durable" | "memory" | "skipped" | null {
  return writes.get(id) ?? null;
}

export interface CachedBrief {
  version: number;
  savedAt: string;
  intel: PersonIntel;
  plan: ConversationPlan;
  report: FetchReport;
  profiles: SocialProfile[];
  links: PublicLink[];
}

const memory = new Map<string, CachedBrief>();

/** Keep a finished live attempt, including a timeout that fell back to the snapshot. */
export function isStoredBrief(brief: CachedBrief | null | undefined): brief is CachedBrief {
  if (!brief || brief.version !== BRIEF_CACHE_VERSION || !brief.intel || !brief.plan || !brief.report || !brief.savedAt) {
    return false;
  }
  if (!Array.isArray(brief.profiles) || !Array.isArray(brief.links)) return false;
  if (brief.intel.mode !== "snapshot" || brief.plan.mode !== "template") return true;
  return liveAttempt(brief.report);
}

const SKIP_REASONS = new Set(["not configured", "not requested", "no public url", ""]);

function liveAttempt(report: FetchReport): boolean {
  const rows: [FetchReport["serp"], string][] = [
    [report.serp, report.serpReason],
    [report.unlock, report.unlockReason],
    [report.linkedin, report.linkedinReason],
  ];
  return rows.some(([state, reason]) => {
    if (state === "live") return true;
    if (state !== "failed") return false;
    return !SKIP_REASONS.has(reason);
  });
}

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

export async function writeBriefCache(id: string, brief: CachedBrief): Promise<"durable" | "memory" | "skipped"> {
  if (!safeId(id) || !isStoredBrief(brief)) {
    writes.set(id, "skipped");
    return "skipped";
  }
  memory.set(id, brief);
  try {
    const db = await withTimeout(getDb(), 2000, "cache connect timed out");
    if (!db) {
      writes.set(id, "memory");
      return "memory";
    }
    const graph = db.selectGraph(graphName());
    await withTimeout(
      graph.query("MATCH (p:Person {id: $id}) SET p.brief_json = $brief", {
        params: { id, brief: JSON.stringify(brief) },
      }),
      2000,
      "cache write timed out",
    );
    writes.set(id, "durable");
    return "durable";
  } catch {
    writes.set(id, "memory");
    return "memory";
  }
}

function present(brief: CachedBrief): CachedBrief {
  return { ...brief, intel: markCached(brief.intel) };
}

function fresh(brief: CachedBrief | undefined | null): CachedBrief | null {
  if (!isStoredBrief(brief)) return null;
  const saved = Date.parse(brief.savedAt);
  if (Number.isNaN(saved) || Date.now() - saved > INTEL_CACHE_TTL_MS) return null;
  return brief;
}

function safeId(id: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(id);
}
