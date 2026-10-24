import fs from "fs";
import path from "path";
import { httpsUrl } from "./home";
import { sanitizeCopy } from "./sanitize";

/** Home also checks this path. The committed profile is data/demo-user.json. */
export const DEMO_USER_REL = "src/data/demo-user.json";
const DEMO_USER_PATHS = ["data/demo-user.json", DEMO_USER_REL];

export interface DemoCard {
  name: string;
  headline: string;
  story: string;
  linkedin: string | null;
  photo: string | null;
}

/**
 * Blurb fields used only when neither demo-user file is in this checkout.
 * The committed profile is the source when it is present.
 */
const ATTACHED_PROFILE = {
  name: "Henry Finn",
  linkedin_url: "https://www.linkedin.com/in/henryfinnco/",
  headline:
    "Founder at the intersection of story and technology | Unicorn Studios, Animori, Metacomica, 0N1 Force",
  about:
    "Henry grew up wanting to be a comic book artist and never really stopped telling stories. He studied cinema at SFSU, taught film at the Academy of Art College, and then spent years running Luminous US Productions, a big commercial production agency. He worked on the Spotify x BLACKPINK shoot, and a Salesforce film he made on a roughly $300K budget has driven $20M+ for Salesforce and is still live today. Now he builds where story meets tech: Unicorn Studios makes films for tech companies, Animori and Metacomica build anime and comics IP with AI, and 0N1 Force is an anime franchise he leads as CEO. He also produces and hosts Silicon Valley Insider and co-founded Executive Intelligence. He is a quiet builder who would rather show the work than pitch himself, and he is here to find people to build Animori with.",
  topic_chips: [
    "Storytelling x tech",
    "Anime and comics IP",
    "Building with AI",
    "Film for tech companies",
    "Gaming",
    "Blockchain and IP",
    "The BLACKPINK shoot",
    "Comic book kid",
  ],
};

export function oneLineStory(about: string, chips: readonly string[]): string {
  const sentence = firstSentence(about).replace(/[.!?]+$/, "");
  const seen = new Set<string>();
  const themes: string[] = [];
  for (const chip of chips) {
    const clean = sanitizeCopy(chip).replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (sentence.toLowerCase().includes(key)) continue;
    themes.push(clean);
    if (themes.length === 2) break;
  }
  if (!sentence && themes.length === 0) return "";
  if (!sentence) return `${joinThemes(themes)}.`;
  if (themes.length === 0) return `${sentence}.`;
  return `${sentence}, including ${joinThemes(themes)}.`;
}

export function blurbFromProfile(rawProfile: unknown): Omit<DemoCard, "photo"> | null {
  if (!rawProfile || typeof rawProfile !== "object") return null;
  const record = rawProfile as Record<string, unknown>;
  const name = typeof record.name === "string" ? sanitizeCopy(record.name) : "";
  if (!name) return null;
  const headline = typeof record.headline === "string" ? sanitizeCopy(record.headline) : "";
  const about = typeof record.about === "string" ? record.about : "";
  const chips = Array.isArray(record.topic_chips)
    ? record.topic_chips.filter((chip): chip is string => typeof chip === "string")
    : [];
  const linkedin = typeof record.linkedin_url === "string" ? httpsUrl(record.linkedin_url) : null;
  return { name, headline, story: oneLineStory(about, chips), linkedin };
}

export function loadDemoCard(root = process.cwd()): DemoCard {
  const fromFile = readDemoFile(root);
  const blurb = fromFile ?? blurbFromProfile(ATTACHED_PROFILE);
  return {
    name: blurb?.name || "Henry Finn",
    headline: blurb?.headline || "",
    story: blurb?.story || "",
    linkedin: blurb?.linkedin ?? null,
    photo: localPhoto(root),
  };
}

function readDemoFile(root: string): Omit<DemoCard, "photo"> | null {
  for (const rel of DEMO_USER_PATHS) {
    const full = path.join(root, rel);
    try {
      if (!fs.existsSync(full)) continue;
      const blurb = blurbFromProfile(JSON.parse(fs.readFileSync(full, "utf8")));
      if (blurb) return blurb;
    } catch {
      continue;
    }
  }
  return null;
}

function localPhoto(root: string): string | null {
  const henry = path.join(root, "public", "henry.jpg");
  if (fs.existsSync(henry)) return "/henry.jpg";
  return null;
}

function firstSentence(text: string): string {
  const clean = sanitizeCopy(text).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = /^.*?[.!?](?=\s|$)/.exec(clean);
  return (match?.[0] ?? clean).trim();
}

function joinThemes(themes: string[]): string {
  if (themes.length <= 1) return themes[0] ?? "";
  if (themes.length === 2) return `${themes[0]} and ${themes[1]}`;
  return `${themes.slice(0, -1).join(", ")}, and ${themes[themes.length - 1]}`;
}
