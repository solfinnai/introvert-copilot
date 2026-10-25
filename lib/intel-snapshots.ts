import fs from "fs";
import path from "path";

/**
 * Committed intel for one speaker.
 * Shape matches the brief cache: version, savedAt, intel, plan, report, profiles, links.
 * Files live at data/intel-snapshots/<personId>.json and never expire.
 * The owner adds the speaker files. This module only reads them.
 */
export const INTEL_SNAPSHOT_DIR = "data/intel-snapshots";

const ID = /^[a-z0-9-]{1,80}$/;
const memo = new Map<string, unknown | null>();
let rootOverride: string | null = null;

export function setIntelSnapshotDirForTests(dir: string | null): void {
  rootOverride = dir;
  memo.clear();
}

/** Raw JSON from the snapshot file. Validation lives with the brief cache. */
export function readSnapshotJson(id: string): unknown | null {
  if (!ID.test(id)) return null;
  const dir = snapshotDir();
  const key = `${dir}\0${id}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  const parsed = loadJson(dir, id);
  if (parsed !== null) memo.set(key, parsed);
  return parsed;
}

/** "Saved intel, Oct 24, 2026". Pacific date so server and browser agree. */
export function savedIntelLine(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "Saved intel";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date);
  return `Saved intel, ${formatted}`;
}

function snapshotDir(): string {
  if (rootOverride) return rootOverride;
  return path.join(process.cwd(), INTEL_SNAPSHOT_DIR);
}

function loadJson(dir: string, id: string): unknown | null {
  const root = path.resolve(dir);
  const file = path.resolve(root, `${id}.json`);
  if (file !== path.join(root, `${id}.json`)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}
