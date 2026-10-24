import type { GraphBackend, PathChip } from "./types";
import { sanitizeCopy } from "./sanitize";
import { humanList } from "./text";

const EDGE_LABELS: Record<string, string> = {
  INTERESTED_IN: "You like",
  ABOUT: "Talk about",
  PRESENTS: "Presented by",
  CO_PRESENTS: "Speaking with",
};

export function humanEdgeLabel(text: string): string {
  if (EDGE_LABELS[text]) return EDGE_LABELS[text];
  const words = text.split("_").filter(Boolean).map((word) => word.toLowerCase());
  return words.length ? words.join(" ") : text;
}

export function humanNoteLabel(text: string): string {
  const match = /^Keyword match:?\s*(.*)$/i.exec(text.trim());
  if (!match) return text;
  const term = phraseHit(match[1] ?? "");
  return term ? `Bio or title mentions ${term}` : "Bio or title mention";
}

export function introRelationLabel(sessionType: string | null | undefined): string {
  return isPanel(sessionType) ? "Also on the panel" : "Speaking with";
}

export function discoveryLabel(backend: GraphBackend): { found: string; toggle: string } {
  return {
    found: backend === "falkordb" ? "Found with FalkorDB" : "Found with the in-memory graph",
    toggle: backend === "falkordb" ? "How FalkorDB found this" : "How the graph found this",
  };
}

export function explainMatch(input: {
  name: string;
  sessionTitle: string | null;
  sessionType?: string | null;
  path: Pick<PathChip, "kind" | "text">[];
  introName: string | null;
  keywordHits: string[];
}): string {
  const name = input.name.replace(/\s+/g, " ").trim() || "This person";
  const first = name.split(" ")[0] || name;
  const session = embedTitle((input.sessionTitle ?? "").replace(/\s+/g, " ").trim());
  const intro = input.introName?.replace(/\s+/g, " ").trim() || null;
  const topic = topicAfterInterest(input.path);
  const sentences: string[] = [];

  if (topic) {
    sentences.push(`You like ${phraseTopic(topic)}.`);
    sentences.push(
      session
        ? `${possessive(first)} talk, ${session}, is about it.`
        : `${name} is on your list because of that.`,
    );
  } else {
    const hits = mentionedHits(input);
    sentences.push(
      hits.length
        ? `${possessive(first)} bio or title mentions ${humanList(hits)}.`
        : `${name} is on your list from the speaker catalog.`,
    );
    if (session) sentences.push(`${first} is presenting ${session}.`);
  }

  return sanitizeCopy(attachIntro(sentences, intro, first, input.sessionType ?? null));
}

export function visiblePath(path: PathChip[], sessionTitle: string | null): PathChip[] {
  if (path.some((chip) => chip.kind === "note")) return visibleKeywordPath(path, sessionTitle);
  return path.map((chip) =>
    chip.kind === "edge" ? { ...chip, text: humanEdgeLabel(chip.text) } : chip,
  );
}

export function visibleIntroPath(path: PathChip[], sessionType: string | null = null): PathChip[] {
  return path.map((chip) => {
    if (chip.kind !== "edge") return chip;
    const text = chip.text === "CO_PRESENTS" ? introRelationLabel(sessionType) : humanEdgeLabel(chip.text);
    return { ...chip, text };
  });
}

function visibleKeywordPath(path: PathChip[], sessionTitle: string | null): PathChip[] {
  const note = path.find((chip) => chip.kind === "note");
  const nodes = path.filter((chip) => chip.kind === "node");
  const session = sessionNode(path, sessionTitle);
  const person = nodes.find((node) => node !== session);
  const chips: PathChip[] = [];
  if (note) chips.push({ ...note, text: humanNoteLabel(note.text) });
  if (session) {
    chips.push(session);
    chips.push({ kind: "edge", text: humanEdgeLabel("PRESENTS"), tone: "plain" });
  }
  if (person) chips.push(person);
  return chips;
}

function sessionNode(path: PathChip[], sessionTitle: string | null): PathChip | undefined {
  if (sessionTitle) {
    const titled = path.find((chip) => chip.kind === "node" && isSessionNode(chip.text, sessionTitle));
    if (titled) return titled;
  }
  const edgeIndex = path.findIndex((chip) => chip.kind === "edge" && chip.text === "PRESENTS");
  if (edgeIndex < 0) return undefined;
  return path.slice(edgeIndex + 1).find((chip) => chip.kind === "node");
}

function isSessionNode(text: string, sessionTitle: string): boolean {
  const full = sessionTitle.trim();
  if (!full) return false;
  if (text === full) return true;
  const short = text.replace(/\.\.\.$/, "").trim();
  return short.length >= 12 && full.startsWith(short);
}

function topicAfterInterest(path: Pick<PathChip, "kind" | "text">[]): string | null {
  let sawInterest = false;
  for (const chip of path) {
    if (chip.kind === "edge" && chip.text === "INTERESTED_IN") {
      sawInterest = true;
      continue;
    }
    if (sawInterest && chip.kind === "node") return chip.text.trim() || null;
  }
  return null;
}

function mentionedHits(input: { path: Pick<PathChip, "kind" | "text">[]; keywordHits: string[] }): string[] {
  const fromHits = input.keywordHits.map(phraseHit).filter(Boolean);
  if (fromHits.length) return fromHits.slice(0, 3);
  const note = input.path.find((chip) => chip.kind === "note")?.text ?? "";
  const match = /^Keyword match:?\s*(.*)$/i.exec(note.trim());
  const term = phraseHit(match?.[1] ?? "");
  return term ? [term] : [];
}

function phraseHit(term: string): string {
  const clean = term.trim();
  if (!clean) return "";
  if (clean.toLowerCase() === "ai") return "AI";
  return clean;
}

function phraseTopic(topic: string): string {
  const clean = topic.replace(/\s+/g, " ").trim();
  if (!clean) return "this";
  const spaced = clean.replace(/:\s*/g, " ");
  if (/^[A-Z0-9]{2,}\b/.test(spaced)) {
    return spaced.replace(/\s+([A-Za-z])([a-z]+)/g, (_match, first: string, rest: string) => {
      return ` ${first.toLowerCase()}${rest}`;
    });
  }
  return spaced.charAt(0).toLowerCase() + spaced.slice(1);
}

function possessive(name: string): string {
  return `${name}'s`;
}

function isPanel(sessionType: string | null | undefined): boolean {
  return /panel/i.test(sessionType ?? "");
}

function embedTitle(title: string): string {
  const stripped = title.replace(/[.?!…]+$/g, "").trim();
  return stripped || title.trim();
}

function attachIntro(
  sentences: string[],
  intro: string | null,
  first: string,
  sessionType: string | null,
): string {
  const kept = sentences.filter(Boolean).slice(0, 2);
  if (!intro) return kept.join(" ");
  const clause = isPanel(sessionType)
    ? `${intro} is on ${possessive(first)} panel and could introduce you.`
    : `${intro} is speaking with ${first} and could introduce you.`;
  if (kept.length === 0) return clause;
  if (kept.length === 1) return `${kept[0]} ${clause}`;
  const last = kept[1].replace(/[.?!]$/, "");
  return `${kept[0]} ${last}, and ${clause}`;
}
