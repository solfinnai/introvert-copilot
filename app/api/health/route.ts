import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/limits";
import { liveCounts } from "@/lib/seed-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const limit = rateLimit(`health:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a little and try again." }, { status: 429 });
  }
  try {
    const report = await liveCounts();
    return NextResponse.json(
      { ok: true, backend: report.backend, nodes: report.nodes, edges: report.edges },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, backend: "memory", nodes: 0, edges: 0 }, { status: 500 });
  }
}
