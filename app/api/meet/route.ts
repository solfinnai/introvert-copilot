import { NextResponse } from "next/server";
import { recommend } from "@/lib/graph";
import { clientIp, meetLimitKey, rateLimit } from "@/lib/limits";
import { parseTalkTopics } from "@/lib/talk-topics";
import type { DayFilter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const limit = rateLimit(meetLimitKey(clientIp(req)), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Slow down a little and try again." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } },
    );
  }
  const url = new URL(req.url);
  try {
    const result = await recommend({
      day: parseDay(url.searchParams.get("day")),
      metIds: parseIds(url.searchParams.get("met")),
      talkTopics: parseTalkTopics((url.searchParams.get("topics") ?? "").slice(0, 400).split("|")),
      limit: 10,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not rank people." }, { status: 500 });
  }
}

function parseDay(value: string | null): DayFilter {
  if (value === "wed" || value === "thu") return value;
  return "both";
}

function parseIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9-]{1,80}$/.test(id))
    .slice(0, 40);
}
