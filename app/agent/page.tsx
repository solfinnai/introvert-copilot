import { AgentChat } from "@/components/AgentChat";
import { pageBundle } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { person } = await searchParams;
  const id = typeof person === "string" && /^[a-z0-9-]{1,80}$/.test(person) ? person : null;
  return <AgentChat bundle={pageBundle(id)} />;
}
