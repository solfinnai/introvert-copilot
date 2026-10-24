import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BriefSkeleton } from "@/components/BriefSkeleton";
import { PersonActions } from "@/components/PersonActions";
import { PersonDossier } from "@/components/PersonDossier";
import { PersonPhoto } from "@/components/PersonPhoto";
import { getCatalog } from "@/lib/catalog";
import { describePerson } from "@/lib/graph";
import { loadPersonBrief } from "@/lib/person-brief";
import type { RankedPerson } from "@/lib/types";
import type { SavedPerson } from "@/components/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const described = await describePerson(id);
  const person = getCatalog().peopleById.get(id);
  if (!described || !person) notFound();
  const card = described.card;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/meet" className="text-sm text-mute">
        Back to who to meet
      </Link>
      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <PersonPhoto src={card.photoUrl} name={card.name} size={72} />
        <div className="min-w-0">
          <h1 className="break-words font-serif text-4xl tracking-tight">{card.name}</h1>
          <p className="text-mute">{card.titleLine}</p>
          <p className="mt-1 text-sm">Catch them: {card.catchLine}</p>
        </div>
      </header>
      <div className="mt-4">
        <PersonActions person={toSaved(card)} />
      </div>
      <Suspense fallback={<BriefSkeleton />}>
        <BriefBlock card={card} backend={described.backend} ms={described.ms} />
      </Suspense>
    </div>
  );
}

async function BriefBlock({
  card,
  backend,
  ms,
}: {
  card: RankedPerson;
  backend: "falkordb" | "memory";
  ms: number;
}) {
  const brief = await loadPersonBrief(card);
  return (
    <PersonDossier
      card={card}
      intel={brief.intel}
      plan={brief.plan}
      report={brief.report}
      backend={backend}
      ms={ms}
    />
  );
}

function toSaved(person: RankedPerson): SavedPerson {
  return {
    id: person.id,
    name: person.name,
    titleLine: person.titleLine,
    photoUrl: person.photoUrl,
    opener: person.opener,
    catchLine: person.catchLine,
  };
}
