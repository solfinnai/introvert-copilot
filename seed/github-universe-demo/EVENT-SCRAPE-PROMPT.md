# feat/event-scrape: Cursor prompt + code sketch

Bright Data is the app's live source for event data. The `github-universe-demo/` bundle is the fallback cache and the ground truth to check against.

## What the target looks like (checked 2026-10-24, 10:45 AM PT)
| URL | Rendering | Notes |
|---|---|---|
| https://githubuniverse.com/ | Next.js, mostly static | Name, dates, and venue are in the HTML |
| https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers | **JS-rendered (RainFocus)** | Raw HTML has **no speaker names**. Web Unlocker `raw` alone returns an empty shell. |
| https://reg.githubuniverse.com/flow/common/speaker/loadEventSpeakers?... | XHR JSON | Needs a session `rfcsrf` header. Don't use it. |
| **https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU&type=speaker&size=50&from=0** | **Public JSON, plain GET** | No cookie or CSRF needed. 183 speakers. Max 50 per page, so use from=0/50/100/150. |
| same with `type=session` | Public JSON | 157 sessions with times[].date/startTimeFormatted/room |

Page 1 is shaped `{sectionList:[{total,items:[...]}]}`. Later pages are `{total,items:[...]}`.

## Bright Data costs (from brightdata.com pricing pages, 2026-10-24)
- Free tier: **5,000 credits/month** shared across Web Unlocker, SERP, and Scraper API (docs.brightdata.com free-tier page).
- Web Unlocker: **$1.5 per 1K successful requests** on pay-as-you-go. A full GitHub Universe load is about 8 requests (4 speaker pages and 4 session pages).
- SERP API: **$1.5 per 1K requests**. One LinkedIn lookup per person is 183 for the whole event, so run it only for the top 15 to 20.
- LinkedIn People Profiles scraper (`gd_l1viktl72bvl7bjuj0`): **$1.5 per 1K records**, and failures aren't charged.
- The whole demo should fit inside the free tier.
- LinkedIn caveat from Bright Data's docs: since Nov 13, 2025, Position, Experience, and Education fill rates are about 2%. Use `about`, `posts`, `current_company`, and `city` instead, and mark the rest GAP.

## Cursor prompt (paste as-is)
```
Branch feat/event-scrape. Small PR for Qodo review.

Add lib/brightdata.ts and app/api/event/load/route.ts (Next.js App Router, TypeScript, port 3001).

Env: BRIGHTDATA_API_KEY, BRIGHTDATA_UNLOCKER_ZONE, BRIGHTDATA_SERP_ZONE, OPENAI_API_KEY, FALKORDB_URL.

lib/brightdata.ts exports:
- unlock(url): POST https://api.brightdata.com/request {zone: BRIGHTDATA_UNLOCKER_ZONE, url, format:"raw"} with Authorization: Bearer BRIGHTDATA_API_KEY. Returns text. 60s timeout, 1 retry.
- serp(query): POST https://api.brightdata.com/request {zone: BRIGHTDATA_SERP_ZONE, url:"https://www.google.com/search?q="+encodeURIComponent(query)+"&brd_json=1", format:"raw"}. Parse JSON, return organic[] {link,title}.
- findLinkedIn(name, company): serp(`site:linkedin.com/in "${name}" "${company}"`). Return the first link matching /linkedin\.com\/in\//, else null.
- linkedinProfile(url): POST https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&format=json body [{url}]. On HTTP 202 return {pending:true, snapshot_id}. Otherwise return the first record.
- cached(key, fn): file cache in .cache/brightdata/<sha1(key)>.json storing {fetched_at, data}. TTL 24h. Pass ?refresh=1 to bypass.

POST /api/event/load {url}:
1. Detect the adapter. If the URL host is githubuniverse.com or reg.githubuniverse.com, use the RainFocus adapter. Paginate unlock("https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU&type=speaker&size=50&from="+n) for n=0,50,... until total is reached. Items are in sectionList[0].items on page 1 and in items after that. Do the same for type=session. Join speaker.session[].sessionID to sessions to get title, date, startTimeFormatted, and room.
2. Generic fallback for any other URL: unlock(url), strip scripts and styles, then call OpenAI with structured output (zod schema {event:{name,start,end,venue}, people:[{name,title,company,photo_url,session}]}). The prompt must say "extract only what is present, use null for missing, never invent".
3. Map each speaker to Person {id: slug(name), name, title, company, photo_url, linkedin_url, session, topics:[], sources:[{url,title,date}], fetched_at}. Use the speaker's own linkedIn field if present, otherwise findLinkedIn() for the top N only (N=20, env EVENT_ENRICH_LIMIT). Store any missing value as "GAP".
4. For the top N with a LinkedIn URL, call linkedinProfile(). Save about, city, current_company, and posts (as Article sources). If it's pending, save the snapshot_id and show "enriching…" in the UI.
5. Write to FalkorDB graph "copilot" with parameterized MERGE: (:Event), (:Person), (:Company), (:Topic), (:Article). Edges: SPEAKS_AT {session,date,start,room}, WORKS_AT, INTERESTED_IN, WROTE. Never DELETE.
6. Return {event, people, counts:{people, linkedin_found, gaps}, fetched_at, source:"brightdata"}.
7. If Bright Data fails or times out, load seed/github-universe-demo/people.json + event.json and return source:"cache". The UI shows a "cached" badge.

Add a "Load event" input on the Feed screen that calls the route and shows a progress line per stage.
Unit test: the RainFocus mapper against seed/github-universe-demo/raw/raw_speakers.json (183 speakers, Jake Albaugh first).
```

## Code sketch: lib/brightdata.ts
```ts
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.BRIGHTDATA_API_KEY!;
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const CACHE = path.join(process.cwd(), ".cache/brightdata");

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = 864e5, refresh = false) {
  const f = path.join(CACHE, crypto.createHash("sha1").update(key).digest("hex") + ".json");
  if (!refresh) try {
    const c = JSON.parse(await fs.readFile(f, "utf8"));
    if (Date.now() - Date.parse(c.fetched_at) < ttlMs) return c as { fetched_at: string; data: T };
  } catch {}
  const out = { fetched_at: new Date().toISOString(), data: await fn() };
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(f, JSON.stringify(out));
  return out;
}

export async function unlock(url: string): Promise<string> {
  const r = await fetch("https://api.brightdata.com/request", {
    method: "POST", headers: H, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ zone: process.env.BRIGHTDATA_UNLOCKER_ZONE, url, format: "raw" }),
  });
  if (!r.ok) throw new Error(`unlocker ${r.status}`);
  return r.text();
}

export async function serp(q: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&brd_json=1`;
  const r = await fetch("https://api.brightdata.com/request", {
    method: "POST", headers: H,
    body: JSON.stringify({ zone: process.env.BRIGHTDATA_SERP_ZONE, url, format: "raw" }),
  });
  const j = JSON.parse(await r.text());
  return (j.organic ?? []) as { link: string; title: string }[];
}

export async function findLinkedIn(name: string, company: string) {
  const hits = await serp(`site:linkedin.com/in "${name}" "${company}"`);
  return hits.find(h => /linkedin\.com\/in\//.test(h.link))?.link ?? null;
}

export async function linkedinProfile(url: string) {
  const r = await fetch("https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&format=json",
    { method: "POST", headers: H, body: JSON.stringify([{ url }]) });
  if (r.status === 202) return { pending: true, ...(await r.json()) }; // { snapshot_id }
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

// RainFocus adapter (GitHub Universe)
const RF = "https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU";
export async function rainfocusAll(type: "speaker" | "session") {
  const items: any[] = []; let from = 0, total = Infinity;
  while (from < total) {
    const j = JSON.parse(await unlock(`${RF}&type=${type}&size=50&from=${from}`));
    const page = j.sectionList?.[0] ?? j;
    total = page.total ?? j.totalSearchItems ?? 0;
    if (!page.items?.length) break;
    items.push(...page.items); from += 50;
  }
  return items;
}
```

## Verify
- `curl -X POST localhost:3001/api/event/load -d '{"url":"https://githubuniverse.com/"}' -H 'content-type: application/json' | jq '.counts'` should return people 183. Check names against `seed/github-universe-demo/all-speakers.json`.
- Pull the Bright Data key: the app should return source "cache" with 15 people.
