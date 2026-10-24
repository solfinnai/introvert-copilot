import { sanitizeCopy } from "./sanitize";

export const PLATFORM_ORDER = [
  "linkedin",
  "x",
  "github",
  "youtube",
  "website",
  "instagram",
  "mastodon",
  "bluesky",
  "medium",
  "devto",
  "substack",
] as const;

export type ProfilePlatform = (typeof PLATFORM_ORDER)[number];
export type LinkGroup = "articles" | "sites" | "news";
export type LinkOrigin = "live" | "snapshot";

export interface SocialProfile {
  platform: ProfilePlatform;
  url: string;
  handle: string;
  label: string;
  origin: LinkOrigin;
  fetchedAt: string;
}

export interface PublicLink {
  title: string;
  url: string;
  domain: string;
  group: LinkGroup;
  origin: LinkOrigin;
  fetchedAt: string;
}

export interface PublicHit {
  url: string;
  title: string;
  snippet: string;
  kind: "organic" | "news";
}

export interface MinedPage {
  url: string;
  title: string;
  html: string;
  fetchedAt: string;
}

export interface PublicBundleInput {
  name: string;
  company: string;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  sources: { url: string; title: string }[];
  snapshotFetchedAt: string;
  hits: PublicHit[];
  pages: MinedPage[];
  liveFetchedAt: string | null;
}

const LABELS: Record<ProfilePlatform, string> = {
  linkedin: "Follow on LinkedIn",
  x: "Follow on X",
  github: "Follow on GitHub",
  youtube: "Follow on YouTube",
  website: "Visit their site",
  instagram: "Follow on Instagram",
  mastodon: "Follow on Mastodon",
  bluesky: "Follow on Bluesky",
  medium: "Follow on Medium",
  devto: "Follow on Dev.to",
  substack: "Follow on Substack",
};

const GITHUB_RESERVED = new Set([
  "about",
  "apps",
  "collections",
  "copilot",
  "customer-stories",
  "enterprise",
  "events",
  "explore",
  "features",
  "issues",
  "login",
  "marketplace",
  "new",
  "notifications",
  "orgs",
  "pricing",
  "pulls",
  "security",
  "settings",
  "signup",
  "sponsors",
  "topics",
  "trending",
]);

const MASTODON_HOSTS = new Set([
  "fosstodon.org",
  "hachyderm.io",
  "indieweb.social",
  "infosec.exchange",
  "mas.to",
  "mastodon.online",
  "mastodon.social",
  "mastodon.world",
  "mstdn.social",
  "ruby.social",
  "techhub.social",
]);

const NEWS_HOSTS = [
  "arstechnica.com",
  "axios.com",
  "bbc.co.uk",
  "bbc.com",
  "bloomberg.com",
  "businessinsider.com",
  "cnbc.com",
  "cnet.com",
  "cnn.com",
  "engadget.com",
  "fastcompany.com",
  "forbes.com",
  "fortune.com",
  "infoworld.com",
  "npr.org",
  "nytimes.com",
  "reuters.com",
  "techcrunch.com",
  "technologyreview.com",
  "theatlantic.com",
  "theguardian.com",
  "theinformation.com",
  "theverge.com",
  "venturebeat.com",
  "wired.com",
  "wsj.com",
];

const LINK_CAP = 12;

export function buildPublicBundle(input: PublicBundleInput): { profiles: SocialProfile[]; links: PublicLink[] } {
  const seed = seedProfiles(input);
  const live = input.liveFetchedAt ? liveProfiles(input) : [];
  const profiles = mergeProfiles(seed, live);
  const links = curateLinks(input, profiles);
  return { profiles, links };
}

export function seedProfiles(input: Pick<PublicBundleInput, "name" | "linkedinUrl" | "twitterHandle" | "sources" | "snapshotFetchedAt">): SocialProfile[] {
  const found: SocialProfile[] = [];
  if (input.linkedinUrl) {
    const profile = toProfile(input.linkedinUrl, input.name, {
      origin: "snapshot",
      fetchedAt: input.snapshotFetchedAt,
      trustSeed: true,
    });
    if (profile?.platform === "linkedin") found.push(profile);
  }
  if (input.twitterHandle) {
    const raw = input.twitterHandle.trim().replace(/^@/, "");
    const url = /^https?:\/\//i.test(raw) ? raw : `https://x.com/${raw}`;
    const profile = toProfile(url, input.name, {
      origin: "snapshot",
      fetchedAt: input.snapshotFetchedAt,
      trustSeed: true,
    });
    if (profile?.platform === "x") found.push(profile);
  }
  for (const source of input.sources) {
    const profile = toProfile(source.url, input.name, {
      origin: "snapshot",
      fetchedAt: input.snapshotFetchedAt,
      trustSeed: true,
    });
    if (profile) found.push(profile);
  }
  return mergeProfiles(found, []);
}

export function pickPagesToOpen(hits: { url: string }[], name: string): string[] {
  const personal = hits
    .filter((hit) => isPersonalSite(hit.url, name))
    .sort((a, b) => pathLength(a.url) - pathLength(b.url));
  const github = hits.filter((hit) => isGithubProfile(hit.url, name));
  const urls: string[] = [];
  if (personal[0]) urls.push(personal[0].url);
  if (github[0]) urls.push(github[0].url);
  return uniqueUrls(urls).slice(0, 2);
}

export function profilesLabel(mode: "live" | "cache" | "snapshot", profiles: SocialProfile[]): string {
  if (!profiles.length) return "";
  const anyLive = profiles.some((profile) => profile.origin === "live");
  if (!anyLive) return "Cached snapshot";
  if (mode === "cache") return "Cached live fetch";
  return "Fetched just now";
}

export function linkFreshness(mode: "live" | "cache" | "snapshot", origin: LinkOrigin): string {
  if (origin !== "live") return "Cached snapshot";
  if (mode === "cache") return "Cached live fetch";
  return "Fetched just now";
}

export function hrefsFromHtml(html: string, base: string): string[] {
  const urls: string[] = [];
  const re = /href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && urls.length < 80) {
    const raw = (match[1] || match[2] || "").replace(/&amp;/g, "&").trim();
    if (!raw || raw.startsWith("#") || /^javascript:/i.test(raw) || /^mailto:/i.test(raw)) continue;
    try {
      const url = new URL(raw, base);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      urls.push(url.toString().split("#")[0]);
    } catch {
      continue;
    }
  }
  return urls;
}

function liveProfiles(input: PublicBundleInput): SocialProfile[] {
  const fetchedAt = input.liveFetchedAt || "";
  const found: SocialProfile[] = [];
  for (const hit of input.hits) {
    const profile = toProfile(hit.url, input.name, { origin: "live", fetchedAt, trustSeed: false });
    if (profile) found.push(profile);
  }
  for (const page of input.pages) {
    if (!isPersonalSite(page.url, input.name) && !isGithubProfile(page.url, input.name)) continue;
    const self = toProfile(page.url, input.name, { origin: "live", fetchedAt: page.fetchedAt, trustSeed: false });
    if (self) found.push(self);
    for (const href of hrefsFromHtml(page.html, page.url)) {
      const profile = toProfile(href, input.name, { origin: "live", fetchedAt: page.fetchedAt, trustSeed: false });
      if (profile) found.push(profile);
    }
  }
  return found;
}

function curateLinks(input: PublicBundleInput, profiles: SocialProfile[]): PublicLink[] {
  const hidden = new Set(
    profiles.filter((profile) => profile.platform !== "website").map((profile) => canonical(profile.url)),
  );
  const items: PublicLink[] = [];
  const push = (link: PublicLink | null) => {
    if (!link || hidden.has(canonical(link.url))) return;
    items.push(link);
  };
  if (input.liveFetchedAt) {
    for (const hit of input.hits) {
      push(toLink(hit.url, hit.title, hit.snippet, hit.kind, input.name, "live", input.liveFetchedAt));
    }
    for (const page of input.pages) {
      if (!isPersonalSite(page.url, input.name)) continue;
      push(toLink(page.url, page.title, input.name, "organic", input.name, "live", page.fetchedAt));
    }
  }
  for (const source of input.sources) {
    push(toLink(source.url, source.title, "", "organic", input.name, "snapshot", input.snapshotFetchedAt));
  }
  return capLinks(dedupeLinks(items));
}

function toProfile(
  rawUrl: string,
  name: string,
  meta: { origin: LinkOrigin; fetchedAt: string; trustSeed: boolean },
): SocialProfile | null {
  const parsed = parseProfile(rawUrl, name);
  if (!parsed) return null;
  if (!meta.trustSeed && !handleMatches(parsed.handle, name, false)) return null;
  if (meta.trustSeed && parsed.platform !== "linkedin" && parsed.platform !== "website" && !handleMatches(parsed.handle, name, true)) {
    return null;
  }
  if (meta.trustSeed && parsed.platform === "website" && !isPersonalSite(parsed.url, name)) return null;
  return {
    platform: parsed.platform,
    url: parsed.url,
    handle: parsed.handle,
    label: LABELS[parsed.platform],
    origin: meta.origin,
    fetchedAt: meta.fetchedAt,
  };
}

function parseProfile(rawUrl: string, name: string): { platform: ProfilePlatform; url: string; handle: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    const index = parts.findIndex((part) => part.toLowerCase() === "in");
    const slug = index >= 0 ? parts[index + 1] : "";
    if (!slug || /^(company|jobs|feed|posts|pulse)$/i.test(slug)) return null;
    return { platform: "linkedin", url: `https://www.linkedin.com/in/${slug}`, handle: slug };
  }
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) {
    const handle = parts[0] || "";
    if (!handle || /^(intent|share|home|search|hashtag|i|privacy|tos)$/i.test(handle)) return null;
    return { platform: "x", url: `https://x.com/${handle.replace(/^@/, "")}`, handle: handle.replace(/^@/, "") };
  }
  if (host === "github.com") {
    const handle = parts[0] || "";
    if (parts.length !== 1 || !handle || GITHUB_RESERVED.has(handle.toLowerCase())) return null;
    return { platform: "github", url: `https://github.com/${handle}`, handle };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    if (host === "youtu.be" || parts[0] === "watch" || parts[0] === "shorts" || parts[0] === "playlist" || parts[0] === "results") {
      return null;
    }
    const handle = (parts[0] || "").replace(/^@/, "");
    if (!handle || /^(feed|premium|account|about)$/i.test(handle)) return null;
    if (parts[0] === "channel" || parts[0] === "c" || parts[0] === "user") {
      const id = parts[1] || "";
      if (!id || (parts[0] === "channel" && !handleMatches(id, name, false))) return null;
      const path = parts[0] === "c" || parts[0] === "user" ? `${parts[0]}/${id}` : `@${id.replace(/^@/, "")}`;
      if (parts[0] === "channel") return null;
      return { platform: "youtube", url: `https://www.youtube.com/${path}`, handle: id.replace(/^@/, "") };
    }
    if (!parts[0].startsWith("@") && parts.length !== 1) return null;
    return { platform: "youtube", url: `https://www.youtube.com/@${handle}`, handle };
  }
  if (host === "instagram.com") {
    const handle = parts[0] || "";
    if (!handle || /^(p|reel|reels|explore|stories|accounts|about)$/i.test(handle)) return null;
    return { platform: "instagram", url: `https://www.instagram.com/${handle}`, handle };
  }
  if (host === "bsky.app" || host === "bsky.social") {
    const handle = (parts[0] === "profile" ? parts[1] : parts[0]) || "";
    const clean = handle.replace(/\.bsky\.social$/i, "");
    if (!clean) return null;
    return { platform: "bluesky", url: `https://bsky.app/profile/${handle}`, handle: clean };
  }
  if (MASTODON_HOSTS.has(host) || host.includes("mastodon.")) {
    const handle = (parts[0] || "").replace(/^@/, "");
    if (!handle || parts[0] === "about" || parts[0] === "explore") return null;
    return { platform: "mastodon", url: `https://${host}/@${handle}`, handle };
  }
  if (host === "medium.com" || host.endsWith(".medium.com")) {
    if (host === "medium.com") {
      const handle = (parts[0] || "").replace(/^@/, "");
      if (!handle || parts.length !== 1 || !parts[0].startsWith("@")) return null;
      return { platform: "medium", url: `https://medium.com/@${handle}`, handle };
    }
    const handle = host.replace(/\.medium\.com$/, "");
    if (!handle || handle === "www" || parts.length > 0) return null;
    return { platform: "medium", url: `https://${handle}.medium.com/`, handle };
  }
  if (host === "dev.to") {
    const handle = parts[0] || "";
    if (!handle || parts.length !== 1) return null;
    return { platform: "devto", url: `https://dev.to/${handle}`, handle };
  }
  if (host.endsWith(".substack.com")) {
    const handle = host.replace(/\.substack\.com$/, "");
    if (!handle || parts.length > 1) return null;
    return { platform: "substack", url: `https://${handle}.substack.com/`, handle };
  }
  if (isPersonalSite(url.toString(), name)) {
    return { platform: "website", url: url.toString().split("#")[0], handle: host };
  }
  return null;
}

function toLink(
  rawUrl: string,
  title: string,
  snippet: string,
  kind: "organic" | "news",
  name: string,
  origin: LinkOrigin,
  fetchedAt: string,
): PublicLink | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (isJunkHost(host)) return null;
  if (parseProfile(rawUrl, name) && !isPersonalSite(rawUrl, name)) return null;
  const blob = `${title} ${snippet} ${decodeURIComponent(url.toString())}`;
  const personal = isPersonalSite(rawUrl, name);
  if (!personal && !mentionsPerson(blob, name)) return null;
  const group = groupFor(rawUrl, host, kind, name);
  if (!group) return null;
  const cleanTitle = sanitizeCopy(title || host).slice(0, 140) || host;
  return {
    title: cleanTitle,
    url: url.toString().split("#")[0],
    domain: host,
    group,
    origin,
    fetchedAt,
  };
}

function groupFor(rawUrl: string, host: string, kind: "organic" | "news", name: string): LinkGroup | null {
  if (isPersonalSite(rawUrl, name)) return "sites";
  if (kind === "news" || NEWS_HOSTS.some((item) => host === item || host.endsWith(`.${item}`))) return "news";
  return "articles";
}

export function isPersonalSite(rawUrl: string, name: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (isJunkHost(host) || isPlatformHost(host) || isNewsHost(host)) return false;
  const compact = host.replace(/[^a-z0-9]/g, "");
  const first = firstName(name);
  const last = lastName(name);
  if (last.length < 4) return false;
  if (compact.startsWith(last)) return true;
  if (first.length >= 3 && compact.includes(first) && compact.includes(last)) return true;
  return last.length >= 6 && compact.includes(last);
}

export function isGithubProfile(rawUrl: string, name: string): boolean {
  const parsed = parseProfile(rawUrl, name);
  return parsed?.platform === "github" && handleMatches(parsed.handle, name, false);
}

function isPlatformHost(host: string): boolean {
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return true;
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) return true;
  if (host === "github.com" || host === "youtube.com" || host === "youtu.be" || host === "instagram.com") return true;
  if (host === "bsky.app" || host === "medium.com" || host.endsWith(".medium.com")) return true;
  if (host === "dev.to" || host.endsWith(".substack.com") || host === "substack.com") return true;
  if (MASTODON_HOSTS.has(host) || host.includes("mastodon.")) return true;
  if (host === "facebook.com" || host === "tiktok.com" || host === "wikipedia.org" || host.endsWith(".wikipedia.org")) return true;
  return false;
}

function isNewsHost(host: string): boolean {
  return NEWS_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}

function isJunkHost(host: string): boolean {
  if (host === "google.com" || host.endsWith(".google.com")) return true;
  if (host.endsWith("gstatic.com") || host.endsWith("googleusercontent.com")) return true;
  if (host.includes("githubuniverse.com") || host.includes("rainfocus.com")) return true;
  return false;
}

function handleMatches(handle: string, name: string, loose: boolean): boolean {
  const token = normalize(handle);
  if (token.length < 3) return false;
  const first = firstName(name);
  const last = lastName(name);
  if (last.length >= 4 && token.includes(last)) return true;
  const both = `${first}${last}`;
  if (both.length >= 6 && (token.includes(both) || (token.length >= 6 && both.includes(token)))) return true;
  if (loose && first.length >= 4 && token.includes(first)) return true;
  return false;
}

function mentionsPerson(blob: string, name: string): boolean {
  const text = blob.toLowerCase();
  const last = lastName(name);
  if (last.length >= 4 && text.includes(last)) return true;
  const first = firstName(name);
  return first.length >= 4 && last.length >= 4 && text.includes(first) && text.includes(last);
}

function mergeProfiles(primary: SocialProfile[], extra: SocialProfile[]): SocialProfile[] {
  const byPlatform = new Map<ProfilePlatform, SocialProfile>();
  for (const profile of [...primary, ...extra]) {
    const current = byPlatform.get(profile.platform);
    if (!current) {
      byPlatform.set(profile.platform, profile);
      continue;
    }
    if (current.origin === "snapshot" && profile.origin === "live") continue;
    if (profile.platform === "website" && pathLength(profile.url) < pathLength(current.url)) {
      byPlatform.set(profile.platform, profile);
    }
  }
  return PLATFORM_ORDER.flatMap((platform) => {
    const profile = byPlatform.get(platform);
    return profile ? [profile] : [];
  });
}

function dedupeLinks(links: PublicLink[]): PublicLink[] {
  const seen = new Set<string>();
  const out: PublicLink[] = [];
  for (const link of links) {
    const key = canonical(link.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

function capLinks(links: PublicLink[]): PublicLink[] {
  const groups: Record<LinkGroup, PublicLink[]> = { articles: [], sites: [], news: [] };
  for (const link of links) groups[link.group].push(link);
  const quotas: Record<LinkGroup, number> = { articles: 5, sites: 3, news: 4 };
  const picked: PublicLink[] = [];
  for (const group of ["articles", "sites", "news"] as const) {
    picked.push(...groups[group].slice(0, quotas[group]));
  }
  const overflow = links.filter((link) => !picked.includes(link));
  for (const link of overflow) {
    if (picked.length >= LINK_CAP) break;
    picked.push(link);
  }
  const trimmed = picked.slice(0, LINK_CAP);
  return (["articles", "sites", "news"] as const).flatMap((group) => trimmed.filter((link) => link.group === group));
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const key = canonical(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function canonical(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    const params = new URLSearchParams();
    if (host.includes("youtube.com") || host === "youtu.be") {
      const video = url.searchParams.get("v");
      if (video) params.set("v", video);
    }
    const search = params.toString();
    return `${host}${path}${search ? `?${search}` : ""}`;
  } catch {
    return rawUrl;
  }
}

function pathLength(rawUrl: string): number {
  try {
    return new URL(rawUrl).pathname.length;
  } catch {
    return 999;
  }
}

function firstName(name: string): string {
  return normalize(name.split(/\s+/).filter(Boolean)[0] || "");
}

function lastName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return normalize(parts[parts.length - 1] || "");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
