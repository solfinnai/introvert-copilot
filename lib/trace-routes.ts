/** Files the root layout and seed routes read with fs. */
export const SEED_FILE_GLOBS = [
  "./seed/github-universe-demo/raw/raw_speakers.json",
  "./seed/github-universe-demo/raw/raw_sessions.json",
  "./seed/github-universe-demo/event.json",
  "./seed/github-universe-demo/people.json",
  "./data/demo/henry.json",
  "./src/data/demo-user.json",
  "./seed/github-universe-demo/seed.cypher",
];

/**
 * Every page uses the root layout, which reads the seed JSON.
 * API routes that rank, count, or seed read the same files.
 */
export const SEEDED_ROUTES = [
  "/",
  "/meet",
  "/saved",
  "/story",
  "/chat",
  "/agent",
  "/people/[id]",
  "/api/health",
  "/api/meet",
  "/api/reset",
  "/api/seed",
  "/api/session",
  "/api/agent",
];

export function seedTracingIncludes(): Record<string, string[]> {
  const includes: Record<string, string[]> = {};
  for (const route of SEEDED_ROUTES) includes[route] = SEED_FILE_GLOBS;
  return includes;
}
