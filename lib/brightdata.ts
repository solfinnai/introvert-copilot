import { isBlockedPublicUrl, isLinkedInUrl, normalizeLinkedIn } from "./intel";

export type LiveResult =
  | { ok: true; body: string; fetchedAt: string; url: string }
  | { ok: false; reason: string };

const REQUEST_URL = "https://api.brightdata.com/request";
const DATASET_URL =
  "https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&format=json";

export function searchGoogle(query: string): Promise<LiveResult> {
  const zone = (process.env.BRIGHTDATA_SERP_ZONE || "").trim();
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&brd_json=1&gl=us&hl=en`;
  return postUnlocker(zone, url, 8000);
}

export function unlockPage(pageUrl: string): Promise<LiveResult> {
  if (!pageUrl || isLinkedInUrl(pageUrl) || isBlockedPublicUrl(pageUrl)) {
    return Promise.resolve({ ok: false, reason: "no public url" });
  }
  const zone = (process.env.BRIGHTDATA_UNLOCKER_ZONE || "").trim();
  return postUnlocker(zone, pageUrl, 8000);
}

export async function scrapeLinkedIn(profileUrl: string): Promise<LiveResult> {
  const key = process.env.BRIGHTDATA_API_KEY;
  if (!key) return { ok: false, reason: "not configured" };
  const url = normalizeLinkedIn(profileUrl);
  if (!url) return { ok: false, reason: "no public url" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(DATASET_URL, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ url }]),
    });
    const body = await response.text();
    if (!response.ok) return { ok: false, reason: `http ${response.status}` };
    if (!body.trim()) return { ok: false, reason: "empty body" };
    if (body.includes("snapshot_id") && !/"name"\s*:/.test(body)) {
      return { ok: false, reason: "still pending" };
    }
    return { ok: true, body, fetchedAt: new Date().toISOString(), url };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, reason: aborted ? "timed out" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function postUnlocker(zone: string, url: string, timeoutMs: number): Promise<LiveResult> {
  const key = process.env.BRIGHTDATA_API_KEY;
  if (!key || !zone) return { ok: false, reason: "not configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(REQUEST_URL, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ zone, url, format: "raw" }),
    });
    const body = await response.text();
    if (!response.ok) return { ok: false, reason: `http ${response.status}` };
    if (!body.trim()) return { ok: false, reason: "empty body" };
    return { ok: true, body, fetchedAt: new Date().toISOString(), url };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, reason: aborted ? "timed out" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}
