/** Copy and health parsing for the home screen and the sponsor footer. */

export const HOME_LINE =
  "Walk into every conversation knowing what to say about yourself and what to ask them";

export const HOME_ENTRIES = [
  {
    href: "/meet",
    title: "Who to meet",
    body: "The people worth your energy, and why you two should talk.",
  },
  {
    href: "/saved",
    title: "Saved",
    body: "The few you want to remember, kept on this browser.",
  },
  {
    href: "/agent",
    title: "Ask the agent",
    body: "What to say about yourself, and what to ask them.",
  },
] as const;

export const SPONSORS = [
  { name: "FalkorDB", href: "https://www.falkordb.com/", role: "graph" },
  { name: "Bright Data", href: "https://brightdata.com/", role: "live intel" },
  { name: "TrueFoundry", href: "https://www.truefoundry.com/", role: "agent tools" },
  { name: "Qodo", href: "https://www.qodo.ai/", role: "code review" },
  { name: "OpenAI", href: "https://openai.com/", role: "agent chat" },
] as const;

export interface WhySample {
  id: string;
  name: string;
  why: string;
}

export function sampleWhyLines<T extends WhySample>(people: readonly T[], count = 3): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  const limit = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  for (const person of people) {
    if (picked.length >= limit) break;
    const id = person.id.trim();
    const why = person.why.trim();
    if (!id || !why || seen.has(id)) continue;
    seen.add(id);
    picked.push(person);
  }
  return picked;
}

function grouped(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(value).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "1,204 nodes, 3,401 edges". Null when the numbers are not a real count. */
export function formatGraphSize(nodes: number, edges: number): string | null {
  if (!Number.isFinite(nodes) || !Number.isFinite(edges)) return null;
  const n = Math.trunc(nodes);
  const e = Math.trunc(edges);
  if (n < 0 || e < 0) return null;
  const nodeWord = n === 1 ? "node" : "nodes";
  const edgeWord = e === 1 ? "edge" : "edges";
  return `${grouped(n)} ${nodeWord}, ${grouped(e)} ${edgeWord}`;
}

/** Keep only https URLs so a snapshot cannot inject a script link. */
export function httpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Live FalkorDB size from GET /api/health. Memory fallback counts are not the live graph. */
export function graphSizeFromHealth(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.ok !== true || record.backend !== "falkordb") return null;
  if (typeof record.nodes !== "number" || typeof record.edges !== "number") return null;
  return formatGraphSize(record.nodes, record.edges);
}
