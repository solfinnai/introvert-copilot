type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const PRUNE_AT = 128;

export function meetLimitKey(ip: string): string {
  return `meet:${ip}`;
}

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; remaining: number } {
  if (buckets.size >= PRUNE_AT) pruneExpired(now);
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) return { ok: false, remaining: 0 };
  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, limit - bucket.count) };
}

export function pruneExpired(now = Date.now()): number {
  let removed = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) {
      buckets.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export function bucketCount(): number {
  return buckets.size;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return ip.slice(0, 80);
}

export function resetLimits(): void {
  buckets.clear();
}
