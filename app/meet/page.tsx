import { after } from "next/server";
import { MeetBoard } from "@/components/MeetBoard";
import { recommendFromMemory } from "@/lib/graph";
import type { DayFilter } from "@/lib/types";
import { scheduleTopSpeakerWarm } from "@/lib/warm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MeetPage({ searchParams }: { searchParams: Promise<{ day?: string | string[] }> }) {
  const raw = firstParam((await searchParams).day);
  const day: DayFilter = raw === "wed" || raw === "thu" ? raw : "both";
  const initialMeet = recommendFromMemory({ day, metIds: [], limit: 10 });
  after(() => {
    void scheduleTopSpeakerWarm(initialMeet.people.map((person) => person.id));
  });
  return <MeetBoard initial={initialMeet} initialDay={day} />;
}

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}
