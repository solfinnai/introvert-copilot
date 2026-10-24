import fs from "fs";
import path from "path";

export interface CuratedSource {
  url?: string;
  title?: string;
  date?: string;
}

export interface CuratedPerson {
  id: string;
  topics?: string[];
  fetched_at?: string;
  linkedin_url?: string;
  sources?: CuratedSource[];
}

let cache: Map<string, CuratedPerson> | null = null;

export function curatedById(id: string): CuratedPerson | undefined {
  if (!cache) cache = load();
  return cache.get(id);
}

function load(): Map<string, CuratedPerson> {
  try {
    const file = path.join(process.cwd(), "seed", "github-universe-demo", "people.json");
    const list = JSON.parse(fs.readFileSync(file, "utf8")) as CuratedPerson[];
    return new Map(list.filter((item) => item && item.id).map((item) => [item.id, item]));
  } catch {
    return new Map();
  }
}
