import { getCatalog } from "./catalog";
import { readBriefCache } from "./intel-cache";
import { loadPersonBrief } from "./person-brief";
import { rankPeople } from "./rank";
import type { RankedPerson } from "./types";

export const WARM_LIMIT = 18;
export const WARM_CONCURRENCY = 2;

export function topSpeakers(limit = WARM_LIMIT): RankedPerson[] {
  const size = Math.min(Math.max(limit, 1), 20);
  return rankPeople(getCatalog(), null, { day: "both", metIds: [], limit: size });
}

let scheduled = false;

/**
 * On the first Who to meet render in this process, warm a few top speakers.
 * One at a time, 20 seconds, and only when Bright Data is configured.
 * `npm run warm-intel` covers the full 18 ahead of a demo.
 */
export function scheduleTopSpeakerWarm(): Promise<void> {
  if (scheduled) return Promise.resolve();
  if (!(process.env.BRIGHTDATA_API_KEY || "").trim()) return Promise.resolve();
  scheduled = true;
  return warmSpeakers({ limit: WARM_LIMIT, concurrency: 1, budgetMs: 20_000 }).then(() => undefined);
}

export async function warmSpeakers(
  options: { limit?: number; concurrency?: number; budgetMs?: number } = {},
): Promise<{ warmed: number; skipped: number; failed: number }> {
  const people = topSpeakers(options.limit ?? WARM_LIMIT);
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
        const stored = await readBriefCache(card.id).catch(() => null);
        if (!stored) {
          skipped += 1;
          continue;
        }
        warmed += 1;
        console.log(`Warmed intel for ${card.id}`);
      } catch {
        failed += 1;
        console.log(`Intel warm failed for ${card.id}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { warmed, skipped, failed };
}
