import { after } from "next/server";
import { MeetBoard } from "@/components/MeetBoard";
import { recommendFromMemory } from "@/lib/graph";
import { scheduleTopSpeakerWarm } from "@/lib/warm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const initialMeet = recommendFromMemory({ day: "both", metIds: [], limit: 10 });

export default function MeetPage() {
  after(() => {
    void scheduleTopSpeakerWarm(initialMeet.people.map((person) => person.id));
  });
  return <MeetBoard initial={initialMeet} />;
}
