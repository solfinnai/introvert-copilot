import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE = 60 * 60 * 18;

export async function POST(req: Request) {
  const limit = rateLimit(`session:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a little and try again." }, { status: 429 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  if (!readSid(req)) {
    response.cookies.set("sid", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return response;
}

function readSid(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "sid" && rest.length) return rest.join("=");
  }
  return null;
}
