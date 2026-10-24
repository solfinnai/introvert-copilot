export const DEFAULT_DAILY_AI_BUDGET = 800;

type Bucket = { day: string; used: number };

let bucket: Bucket = { day: "", used: 0 };

export function dailyBudgetLimit(envValue = process.env.DAILY_AI_BUDGET_CALLS): number {
  if (envValue == null || envValue.trim() === "") return DEFAULT_DAILY_AI_BUDGET;
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAILY_AI_BUDGET;
  return Math.min(100_000, Math.floor(parsed));
}

export function resetDailyBudget(): void {
  bucket = { day: "", used: 0 };
}

export function peekDailyBudget(
  now = new Date(),
  limit = dailyBudgetLimit(),
): { used: number; limit: number; remaining: number } {
  const used = bucket.day === utcDay(now) ? bucket.used : 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** Counts one live model call. Resets on the UTC date change. */
export function consumeDailyBudget(
  now = new Date(),
  limit = dailyBudgetLimit(),
): { ok: boolean; used: number; limit: number; remaining: number } {
  const day = utcDay(now);
  if (bucket.day !== day) bucket = { day, used: 0 };
  if (bucket.used >= limit) return { ok: false, used: bucket.used, limit, remaining: 0 };
  bucket.used += 1;
  return { ok: true, used: bucket.used, limit, remaining: Math.max(0, limit - bucket.used) };
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
