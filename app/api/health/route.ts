import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/limits";
import { liveCounts } from "@/lib/seed-graph";
import type { GraphBackend } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRESH_MS = 15_000;
const HEALTH_HEADERS = {
  "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=30",
};

let shared: { at: number; backend: GraphBackend; nodes: number; edges: number } | null = null;

export async function GET(req: Request) {
  const limit = rateLimit(`health:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Slow down a little and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const now = Date.now();
    const report = shared && now - shared.at < FRESH_MS ? shared : { at: now, ...(await liveCounts()) };
    shared = report;
    return NextResponse.json(
      { ok: true, backend: report.backend, nodes: report.nodes, edges: report.edges },
      { headers: HEALTH_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { ok: false, backend: "memory", nodes: 0, edges: 0 },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
