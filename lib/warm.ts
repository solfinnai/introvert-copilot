import { getCatalog } from "./catalog";
import { briefWriteResult, readBriefCache } from "./intel-cache";
import { getDb, graphName, withTimeout } from "./falkor";
import { loadPersonBrief } from "./person-brief";
import { personCard, rankPeople } from "./rank";
import type { RankedPerson } from "./types";

export const WARM_LIMIT = 18;
export const WARM_CONCURRENCY = 2;

const LEASE_ID = "intel-warm";
const LEASE_MS = 6 * 60 * 60 * 1000;

export function topSpeakers(limit = WARM_LIMIT): RankedPerson[] {
  const size = Math.min(Math.max(limit, 1), 20);
  return rankPeople(getCatalog(), null, { day: "both", metIds: [], limit: size });
}

let inflight: Promise<void> | null = null;

/**
 * After Who to meet renders, warm the people already on that list.
 * One Falkor lease, one at a time, 20 seconds, and only when Bright Data is configured.
 * `npm run warm-intel` covers the top 18 ahead of a demo.
 */
export function scheduleTopSpeakerWarm(ids: string[]): Promise<void> {
  if (inflight) return inflight;
  if (!(process.env.BRIGHTDATA_API_KEY || "").trim()) return Promise.resolve();
  if (!(process.env.FALKORDB_URL || "").trim()) return Promise.resolve();
  const wanted = ids.filter((id) => /^[a-z0-9-]{1,80}$/.test(id)).slice(0, WARM_LIMIT);
  if (!wanted.length) return Promise.resolve();
  inflight = claimWarmLease()
    .then((claimed) => {
      if (!claimed) return;
      return warmSpeakers({ ids: wanted, concurrency: 1, budgetMs: 20_000 }).then(() => undefined);
    })
    .catch(() => undefined);
  return inflight;
}

export async function warmSpeakers(
  options: { limit?: number; concurrency?: number; budgetMs?: number; ids?: string[] } = {},
): Promise<{ warmed: number; skipped: number; failed: number }> {
  const people = options.ids?.length ? cardsFor(options.ids) : topSpeakers(options.limit ?? WARM_LIMIT);
  const concurrency = Math.min(Math.max(options.concurrency ?? 1, 1), WARM_CONCURRENCY);
  const budgetMs = options.budgetMs ?? 20_000;
  const deadline = Date.now() + budgetMs;
  let cursor = 0;
  let warmed = 0;
  let skipped = 0;
  let failed = 0;

  async function worker(): Promise<void> {
    while (Date.now() < deadline) {
      const index = cursor;
      cursor += 1;
      const card = people[index];
      if (!card) return;
      const cached = await readBriefCache(card.id).catch(() => null);
      if (cached) {
        skipped += 1;
        continue;
      }
      try {
        await loadPersonBrief(card);
        const outcome = briefWriteResult(card.id);
        if (outcome === "durable") {
          warmed += 1;
          console.log(`Warmed intel for ${card.id}`);
          continue;
        }
        if (outcome === "memory") {
          failed += 1;
          console.log(`Intel warm was not saved for ${card.id}`);
          continue;
        }
        skipped += 1;
      } catch {
        failed += 1;
        console.log(`Intel warm failed for ${card.id}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { warmed, skipped, failed };
}

function cardsFor(ids: string[]): RankedPerson[] {
  const catalog = getCatalog();
  const out: RankedPerson[] = [];
  for (const id of ids) {
    const card = personCard(catalog, id, null, { day: "both", metIds: [], limit: 1 });
    if (!card) continue;
    out.push(card);
    if (out.length >= WARM_LIMIT) break;
  }
  return out;
}

async function claimWarmLease(): Promise<boolean> {
  try {
    const db = await withTimeout(getDb(), 1500, "warm connect timed out");
    if (!db) return false;
    const graph = db.selectGraph(graphName());
    const now = Date.now();
    const read = await withTimeout(
      graph.roQuery<Record<string, unknown>>("MATCH (w:Meta {id: $id}) RETURN w.claimedAt AS claimedAt", {
        params: { id: LEASE_ID },
      }),
      1500,
      "warm lease read timed out",
    );
    const current = Number(read.data?.[0]?.claimedAt ?? 0);
    if (Number.isFinite(current) && current > now - LEASE_MS) return false;
    const wrote = await withTimeout(
      graph.query<Record<string, unknown>>(
        "MERGE (w:Meta {id: $id}) SET w.claimedAt = CASE WHEN coalesce(w.claimedAt, 0) < $stale THEN $now ELSE w.claimedAt END RETURN w.claimedAt AS claimedAt",
        { params: { id: LEASE_ID, now, stale: now - LEASE_MS } },
      ),
      1500,
      "warm lease write timed out",
    );
    return Number(wrote.data?.[0]?.claimedAt) === now;
  } catch {
    return false;
  }
}
