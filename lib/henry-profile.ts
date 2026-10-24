import snapshot from "@/data/demo/henry-linkedin.json";
import { sanitizeCopy } from "./sanitize";

interface RawPost {
  interaction?: string | null;
  link?: string | null;
  title?: string | null;
}

interface RawProfile {
  name?: string;
  first_name?: string;
  city?: string;
  location?: string;
  about?: string | null;
  current_company?: { name?: string } | null;
  current_company_name?: string | null;
  experience?: unknown;
  education?: unknown;
  avatar?: string | null;
  followers?: number | null;
  timestamp?: string;
  bio_links?: { title?: string; link?: string }[];
  activity?: RawPost[];
}

export interface HenryPost {
  title: string;
  url: string;
}

export interface HenryPublic {
  name: string;
  firstName: string;
  city: string;
  location: string;
  about: string;
  company: string;
  companyUrl: string;
  avatar: string;
  followers: number | null;
  linkedinUrl: string;
  fetchedAt: string;
  experienceGap: boolean;
  educationGap: boolean;
  posts: HenryPost[];
  demoGoal: string;
}

const raw = (Array.isArray(snapshot) ? snapshot[0] : snapshot) as RawProfile;

/** Demo event goal Henry set in the product. It is not a LinkedIn field. */
const DEMO_GOAL =
  "Meet 3 to 5 builders working on AI agents, creator tools, and dev storytelling at GitHub Universe 2026.";

export function henryPublic(): HenryPublic {
  const company = raw.current_company?.name || raw.current_company_name || "";
  const companyUrl = (raw.bio_links ?? []).find((item) => item.link)?.link || "";
  const seen = new Set<string>();
  const posts: HenryPost[] = [];
  for (const item of raw.activity ?? []) {
    const url = item.link ?? "";
    const shared = /shared/i.test(item.interaction ?? "");
    const own = /\/posts\/henryfinnco_/i.test(url);
    if (!shared || !own || seen.has(url)) continue;
    const title = sanitizeCopy(item.title ?? "").slice(0, 180);
    if (!title) continue;
    seen.add(url);
    posts.push({ title, url });
    if (posts.length >= 4) break;
  }
  return {
    name: raw.name || "Henry Finn",
    firstName: raw.first_name || "Henry",
    city: raw.city || raw.location || "San Francisco",
    location: raw.location || "San Francisco",
    about: sanitizeCopy(raw.about || ""),
    company,
    companyUrl,
    avatar: raw.avatar || "",
    followers: typeof raw.followers === "number" ? raw.followers : null,
    linkedinUrl: "https://www.linkedin.com/in/henryfinnco/",
    fetchedAt: raw.timestamp || "",
    experienceGap: isEmptyRecord(raw.experience),
    educationGap: isEmptyRecord(raw.education),
    posts,
    demoGoal: DEMO_GOAL,
  };
}

function isEmptyRecord(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
