import { demoProfile } from "./demo-user";
import { sanitizeCopy } from "./sanitize";

export const TALK_TOPICS_KEY = "ic-talk-topics-v1";
export const OWN_WORDS_KEY = "ic-own-words-v1";
export const OWN_WORDS_MAX = 280;

interface Signal {
  chip: string;
  sessionWords: string[];
  bioWords: string[];
}

/** Specific chips win over a broad AI match. */
const SIGNALS: Signal[] = [
  {
    chip: "Anime and comics IP",
    sessionWords: ["anime", "comic", "comics", "manga"],
    bioWords: ["anime", "comic", "comics", "manga"],
  },
  {
    chip: "Comic book kid",
    sessionWords: ["comic", "comics", "manga"],
    bioWords: ["comic", "comics", "manga"],
  },
  {
    chip: "The BLACKPINK shoot",
    sessionWords: ["blackpink", "spotify", "music"],
    bioWords: ["blackpink", "spotify"],
  },
  {
    chip: "Film for tech companies",
    sessionWords: ["film", "video", "cinema"],
    bioWords: ["film", "video", "cinema"],
  },
  {
    chip: "Gaming",
    sessionWords: ["game", "games", "gaming"],
    bioWords: ["game", "games", "gaming"],
  },
  {
    chip: "Blockchain and IP",
    sessionWords: ["blockchain", "crypto", "nft", "web3"],
    bioWords: ["blockchain", "crypto", "nft", "web3"],
  },
  {
    chip: "Storytelling x tech",
    sessionWords: ["story", "storytelling", "narrative"],
    bioWords: ["story", "storytelling", "narrative"],
  },
  {
    chip: "Building with AI",
    sessionWords: ["ai"],
    bioWords: [],
  },
];

export interface LeadSession {
  title: string | null;
  topics: string[];
}

export interface LeadInput {
  chips: string[];
  bio: string;
  keywordHits?: string[];
  sessions: LeadSession[];
}

/** Keep profile order. Drop anything that is not one of Henry's chips. */
export function parseTalkTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(demoProfile.topic_chips);
  const picked = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const chip = item.trim();
    if (allowed.has(chip)) picked.add(chip);
  }
  return demoProfile.topic_chips.filter((chip) => picked.has(chip));
}

/** No saved choice yet means every chip on the profile. A saved empty list stays empty. */
export function readStoredTopics(raw: string | null): string[] {
  if (raw == null || raw.trim() === "") return [...demoProfile.topic_chips];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...demoProfile.topic_chips];
    return parseTalkTopics(parsed);
  } catch {
    return [...demoProfile.topic_chips];
  }
}

export function cleanOwnWords(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeCopy(value.replace(/[\r\n]+/g, " ")).slice(0, OWN_WORDS_MAX);
}

/**
 * One line, only when a chosen chip shows up in catalog text.
 * "They spoke on" requires the session title. A bio hit stays a bio hit.
 */
export function leadWith(input: LeadInput): string | null {
  const selected = new Set(parseTalkTopics(input.chips));
  const bioText = `${input.bio} ${(input.keywordHits ?? []).join(" ")}`;
  for (const signal of SIGNALS) {
    if (!selected.has(signal.chip)) continue;
    for (const session of input.sessions) {
      const sessionText = `${session.title ?? ""} ${session.topics.join(" ")}`;
      const hit = signal.sessionWords.some((word) => hasWord(sessionText, word));
      if (hit && session.title) {
        return sanitizeCopy(`Lead with: ${signal.chip}, they spoke on ${session.title}.`);
      }
    }
    const bioWord = signal.bioWords.find((word) => hasWord(bioText, word));
    if (bioWord) return sanitizeCopy(`Lead with: ${signal.chip}, their catalog bio names ${bioWord}.`);
  }
  return null;
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${word}(?=$|[^a-z0-9])`, "i").test(text);
}
