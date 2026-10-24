import event from "@/seed/github-universe-demo/event.json";
import type { Catalog } from "./catalog";

export const IMPORT_LABEL = "Import conference speakers and people you should meet";

export const MATCH_NOTE =
  "This matches the saved conference catalog against your profile. It does not scrape the site again.";

export const SCRAPE_NOTE =
  "Speaker, session, topic, and company counts were scraped live from the public conference site and saved in this demo.";

/** Long enough to read each stage, still under four seconds. */
export const IMPORT_MS = 3600;

export interface ConferenceFacts {
  name: string;
  dates: string;
  venue: string;
  speakers: number;
  sessions: number;
  topics: number;
  companies: number;
  catalogUrl: string;
  scrapeNote: string;
  matchNote: string;
}

export interface ImportCounts {
  speakers: number;
  sessions: number;
  topics: number;
  shown: number;
}

export interface ImportStageView {
  id: "speakers" | "sessions" | "match" | "rank";
  label: string;
  current: number;
  total: number;
  percent: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function conferenceFacts(catalog: Catalog): ConferenceFacts {
  return {
    name: event.name,
    dates: dateSpan(event.dates.start, event.dates.end),
    venue: event.venue,
    speakers: catalog.speakerCount,
    sessions: catalog.sessionCount,
    topics: catalog.topicNames.length,
    companies: catalog.companies.length,
    catalogUrl: catalog.catalogUrl,
    scrapeNote: SCRAPE_NOTE,
    matchNote: MATCH_NOTE,
  };
}

export function importStageAt(progress: number, counts: ImportCounts): ImportStageView {
  const t = clamp01(progress);
  const percent = t >= 1 ? 100 : Math.round(t * 100);
  const index = t >= 1 ? 3 : Math.min(3, Math.floor(t * 4));
  const local = t >= 1 ? 1 : t * 4 - index;
  const stages: ImportStageView["id"][] = ["speakers", "sessions", "match", "rank"];
  const id = stages[index];
  const total = stageTotal(id, counts);
  const current = Math.max(0, Math.min(total, Math.round(local * total)));
  return { id, label: stageLabel(id, current, total), current, total, percent };
}

function stageTotal(id: ImportStageView["id"], counts: ImportCounts): number {
  if (id === "speakers") return Math.max(0, counts.speakers);
  if (id === "sessions") return Math.max(0, counts.sessions);
  if (id === "match") return Math.max(0, counts.topics);
  return Math.max(0, counts.shown);
}

function stageLabel(id: ImportStageView["id"], current: number, total: number): string {
  if (id === "speakers") return reading("speakers", current, total);
  if (id === "sessions") return reading("sessions", current, total);
  if (id === "match") {
    if (current >= total && total > 0) return "Matching against your story";
    return `Matching against your story, ${current} of ${total} topics`;
  }
  if (current >= total && total > 0) return "Ranking by who you can actually talk to";
  return `Ranking by who you can actually talk to, ${current} of ${total}`;
}

function reading(noun: string, current: number, total: number): string {
  if (total > 0 && current >= total) return `Reading ${total} ${noun}`;
  return `Reading ${current} of ${total} ${noun}`;
}

function dateSpan(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  if (!a || !b) return [start, end].filter(Boolean).join(" to ");
  if (a.year === b.year && a.month === b.month) {
    return `${MONTHS[a.month - 1]} ${a.day} to ${b.day}, ${a.year}`;
  }
  if (a.year === b.year) {
    return `${MONTHS[a.month - 1]} ${a.day} to ${MONTHS[b.month - 1]} ${b.day}, ${a.year}`;
  }
  return `${MONTHS[a.month - 1]} ${a.day}, ${a.year} to ${MONTHS[b.month - 1]} ${b.day}, ${b.year}`;
}

function parts(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year: Number(match[1]), month, day };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
