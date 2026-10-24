import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/limits";
import { ensureCypher } from "@/lib/seed-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Seed route is locked." }, { status: 401 });
  }
  const limit = rateLimit(`seed:${clientIp(req)}`, 4, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a little and try again." }, { status: 429 });
  }
  try {
    const status = await ensureCypher();
    return NextResponse.json({
      ok: status.ok,
      backend: status.backend,
      nodes: status.nodes,
      edges: status.edges,
      seeded: status.seeded,
      already: status.already,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Seed did not finish." }, { status: 500 });
  }
}

function authorized(req: Request): boolean {
  const token = process.env.SEED_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${token}`);
  const got = Buffer.from(header);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}
