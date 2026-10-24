import type { NextConfig } from "next";

const seedGlobs = [
  "./seed/github-universe-demo/raw/raw_speakers.json",
  "./seed/github-universe-demo/raw/raw_sessions.json",
  "./seed/github-universe-demo/event.json",
  "./seed/github-universe-demo/people.json",
  "./data/demo/henry.json",
  "./seed/github-universe-demo/seed.cypher",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["falkordb", "redis"],
  outputFileTracingIncludes: {
    "/api/meet": seedGlobs,
    "/api/health": seedGlobs,
    "/api/seed": seedGlobs,
    "/api/reset": seedGlobs,
    "/meet": seedGlobs,
    "/": seedGlobs,
    "/people/[id]": seedGlobs,
    "/story": seedGlobs,
    "/chat": seedGlobs,
    "/agent": seedGlobs,
    "/api/agent": seedGlobs,
  },
};

export default nextConfig;
