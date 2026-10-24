export const SAVED_STORAGE_KEY = "ic-demo-v1";
export const SAVED_CAP = 24;
export const NOTE_MAX = 280;
export const MET_CAP = 40;

export const NEXT_STEPS = [
  "Ask about their talk",
  "Say hello after the session",
  "Offer one specific story",
  "Ask for a follow-up later",
] as const;

export const DEFAULT_NEXT_STEP: NextStep = "Ask about their talk";

export type NextStep = (typeof NEXT_STEPS)[number];

export interface SavedPerson {
  id: string;
  name: string;
  titleLine: string;
  photoUrl: string;
  opener: string;
  catchLine: string;
  note: string;
  nextStep: string;
}

export interface SavedDraft {
  id: string;
  name: string;
  titleLine?: string;
  photoUrl?: string;
  opener?: string;
  catchLine?: string;
  note?: string;
  nextStep?: string;
}

export interface DemoState {
  saved: SavedPerson[];
  met: string[];
}

export const emptyDemoState: DemoState = { saved: [], met: [] };

export function parseDemoState(raw: string | null): DemoState {
  if (!raw) return emptyDemoState;
  try {
    const parsed = JSON.parse(raw) as { saved?: unknown; met?: unknown };
    const saved = Array.isArray(parsed.saved)
      ? parsed.saved.flatMap((item) => {
          const person = normalizeSaved(item);
          return person ? [person] : [];
        })
      : [];
    const met = Array.isArray(parsed.met)
      ? parsed.met.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80).slice(0, MET_CAP)
      : [];
    return { saved: saved.slice(0, SAVED_CAP), met };
  } catch {
    return emptyDemoState;
  }
}

export function toggleSaved(state: DemoState, person: SavedDraft): DemoState {
  const next = normalizeSaved(person);
  if (!next) return state;
  const exists = state.saved.some((item) => item.id === next.id);
  if (exists) return { ...state, saved: state.saved.filter((item) => item.id !== next.id) };
  return { ...state, saved: [...state.saved, next].slice(-SAVED_CAP) };
}

export function updateSaved(
  state: DemoState,
  id: string,
  patch: { note?: string; nextStep?: string },
): DemoState {
  return {
    ...state,
    saved: state.saved.map((person) => {
      if (person.id !== id) return person;
      const note = patch.note == null ? person.note : clampNote(patch.note);
      const nextStep = patch.nextStep == null ? person.nextStep : cleanNextStep(patch.nextStep);
      return { ...person, note, nextStep };
    }),
  };
}

export function isNextStep(value: string): value is NextStep {
  return (NEXT_STEPS as readonly string[]).includes(value);
}

function normalizeSaved(value: unknown): SavedPerson | null {
  if (!value || typeof value !== "object") return null;
  const person = value as SavedDraft;
  const id = cleanId(person.id);
  const name = cleanLine(person.name, 120);
  if (!id || !name) return null;
  return {
    id,
    name,
    titleLine: cleanLine(person.titleLine, 160),
    photoUrl: cleanLine(person.photoUrl, 400),
    opener: cleanLine(person.opener, 400),
    catchLine: cleanLine(person.catchLine, 160),
    note: clampNote(person.note ?? ""),
    nextStep: cleanNextStep(person.nextStep ?? ""),
  };
}

function cleanId(value: unknown): string {
  if (typeof value !== "string") return "";
  const id = value.trim();
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return "";
  return id;
}

function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function clampNote(value: string): string {
  return value.replace(/\r\n/g, "\n").slice(0, NOTE_MAX);
}

export function cleanNextStep(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return isNextStep(clean) ? clean : DEFAULT_NEXT_STEP;
}
