import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonLive } from "@/components/PersonLive";
import { HERO_CYPHER, getCatalog } from "@/lib/catalog";
import { buildSeedBrief } from "@/lib/person-brief";
import { personCard } from "@/lib/rank";
import { formatSessionLine, sessionsForPerson } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  const { id } = await params;
  const report = (await searchParams).report === "1";
  const catalog = getCatalog();
  if (!catalog.peopleById.has(id)) notFound();
  const started = performance.now();
  const card = personCard(catalog, id, null, { day: "both", metIds: [], limit: 1 });
  if (!card) notFound();
  const ms = Math.max(1, Math.round(performance.now() - started));
  const seed = buildSeedBrief(card);
  const sessions = sessionsForPerson(catalog, id).map((session) => ({
    title: session.title || "Session title not listed",
    line: formatSessionLine(session),
  }));
  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/meet" className="text-sm text-mute">
          Back to who to meet
        </Link>
        <Link href="/speakers" className="text-sm text-mute">
          All speakers
        </Link>
      </div>
      <PersonLive
        key={card.id}
        card={card}
        seed={seed}
        sessions={sessions}
        fetchedLabel={catalog.fetchedLabel}
        cypher={HERO_CYPHER}
        backend="memory"
        ms={ms}
        report={report}
      />
    </div>
  );
}
