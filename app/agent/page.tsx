import { AgentChat } from "@/components/AgentChat";
import { STORY_STARTER, type SpeakerOption } from "@/lib/agent-starters";
import { pageBundle } from "@/lib/agent";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; start?: string }>;
}) {
  const { person, start } = await searchParams;
  const id = typeof person === "string" && /^[a-z0-9-]{1,80}$/.test(person) ? person : null;
  const autostart = start === "story" ? STORY_STARTER : null;
  const speakers: SpeakerOption[] = getCatalog().people.map((item) => ({
    id: item.id,
    name: item.name,
    titleLine: [item.title, item.company].filter(Boolean).join(", "),
    photoUrl: item.photoUrl,
  }));
  return (
    <AgentChat
      key={`${id ?? "general"}:${autostart ?? ""}`}
      person={pageBundle(id).person}
      autostart={autostart}
      speakers={speakers}
    />
  );
}
