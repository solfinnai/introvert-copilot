import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BriefSkeleton } from "@/components/BriefSkeleton";
import { PersonActions } from "@/components/PersonActions";
import { PersonDossier } from "@/components/PersonDossier";
import { PersonPhoto } from "@/components/PersonPhoto";
import { ReportLinks } from "@/components/ReportLinks";
import { ReportSkeletons } from "@/components/ReportSkeletons";
import { SocialIcons } from "@/components/SocialIcons";
import { getCatalog } from "@/lib/catalog";
import { describePerson } from "@/lib/graph";
import { loadPersonBrief } from "@/lib/person-brief";
import { seedProfiles } from "@/lib/public-links";
import type { RankedPerson } from "@/lib/types";
import type { SavedDraft } from "@/components/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  const { id } = await params;
  const report = (await searchParams).report === "1";
  const described = await describePerson(id);
  const person = getCatalog().peopleById.get(id);
  if (!described || !person) notFound();
  const card = described.card;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/meet" className="text-meta text-accent hover:underline">
          Back to who to meet
        </Link>
        <Link href="/speakers" className="text-meta text-accent hover:underline">
          All speakers
        </Link>
      </div>
      <header className="mt-3">
        <div className="flex items-start gap-3">
          <PersonPhoto src={card.photoUrl} name={card.name} size={40} />
          <div className="min-w-0">
            <h1 className="type-display break-words text-[22px] leading-7">{card.name}</h1>
            <p className="text-body text-mute">{card.titleLine}</p>
            <p className="mt-1 text-meta text-faint">Catch them: {card.catchLine}</p>
          </div>
        </div>
        <div className="mt-4">
          <Suspense fallback={<SocialIcons profiles={seedFor(person)} mode="snapshot" />}>
            <HeaderProfiles card={card} />
          </Suspense>
        </div>
      </header>
      <div className="no-print mt-3">
        <PersonActions person={toSaved(card)} />
        <ReportLinks id={card.id} report={report} />
      </div>
      <div id="report">
        <Suspense fallback={report ? <ReportSkeletons /> : <BriefSkeleton />}>
          <BriefBlock card={card} backend={described.backend} ms={described.ms} />
        </Suspense>
      </div>
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
      links={brief.links}
      backend={backend}
      ms={ms}
    />
  );
}

async function HeaderProfiles({ card }: { card: RankedPerson }) {
  const brief = await loadPersonBrief(card);
  return <SocialIcons profiles={brief.profiles} mode={brief.intel.mode} />;
}

function seedFor(person: { name: string; linkedinUrl: string | null; twitterHandle: string | null; articles: { url: string; label: string }[] }) {
  const catalog = getCatalog();
  return seedProfiles({
    name: person.name,
    linkedinUrl: person.linkedinUrl,
    twitterHandle: person.twitterHandle,
    sources: person.articles.map((article) => ({ url: article.url, title: article.label })),
    snapshotFetchedAt: catalog.fetchedAt,
  });
}

function toSaved(person: RankedPerson): SavedDraft {
  return {
    id: person.id,
    name: person.name,
    titleLine: person.titleLine,
    photoUrl: person.photoUrl,
    opener: person.opener,
    catchLine: person.catchLine,
  };
}
