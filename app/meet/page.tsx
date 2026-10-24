import { MeetBoard } from "@/components/MeetBoard";
import { recommend } from "@/lib/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function MeetPage() {
  const initial = await recommend({ day: "both", metIds: [], limit: 10 });
  return <MeetBoard initial={initial} />;
}
