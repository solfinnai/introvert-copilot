/** Whole words only. "story" does not match "history" or "storytelling". */
export const BACKGROUND_TERMS = [
  "film",
  "video",
  "story",
  "storytelling",
  "creator",
  "design",
  "media",
  "ai",
  "anime",
  "comics",
] as const;

export type BackgroundTerm = (typeof BACKGROUND_TERMS)[number];

const DISTINCTIVE = new Set<string>(BACKGROUND_TERMS.filter((term) => term !== "ai"));

export function wholeWordHits(text: string): BackgroundTerm[] {
  const hits: BackgroundTerm[] = [];
  for (const term of BACKGROUND_TERMS) {
    const re = new RegExp(`(?:^|[^a-z0-9])${term}(?=$|[^a-z0-9])`, "i");
    if (re.test(text)) hits.push(term);
  }
  return hits;
}

export function isDistinctive(term: string): boolean {
  return DISTINCTIVE.has(term);
}
