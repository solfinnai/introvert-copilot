import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`reset:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a little and try again." }, { status: 429 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("sid", crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 18,
  });
  return response;
}
