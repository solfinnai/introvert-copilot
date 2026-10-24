import Link from "next/link";
import { notFound } from "next/navigation";
import { GraphPath } from "@/components/GraphPath";
import { PersonPhoto } from "@/components/PersonPhoto";
import { HERO_CYPHER, getCatalog } from "@/lib/catalog";
import { describePerson } from "@/lib/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const described = await describePerson(id);
  const raw = getCatalog().peopleById.get(id);
  if (!described || !raw) notFound();
  const card = described.card;
  const session = raw.sessionIds
    .map((sid) => getCatalog().sessionsById.get(sid))
    .find((item) => item && !item.skip);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/meet" className="text-sm text-mute">
        Back to who to meet
      </Link>
      <header className="mt-3 flex items-start gap-4">
        <PersonPhoto src={card.photoUrl} name={card.name} size={72} />
        <div>
          <h1 className="font-serif text-4xl tracking-tight">{card.name}</h1>
          <p className="text-mute">{card.titleLine}</p>
          <p className="mt-1 text-sm">Catch them: {card.catchLine}</p>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-line bg-card p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#b33b12]">Why you should meet</p>
        <p className="mt-2 text-[15px] leading-7">{card.why}</p>
        <p className="mt-4 border-l-2 border-accent pl-3 font-serif text-lg leading-7">{card.opener}</p>
      </section>

      <GraphPath
        path={card.path}
        introPath={card.introPath}
        introName={card.introVia?.name ?? null}
        hops={card.hops}
        ms={described.ms}
        backend={described.backend}
        cypher={HERO_CYPHER}
        keywordHits={card.keywordHits}
        fetchedLabel={getCatalog().fetchedLabel}
      />

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Catalog snapshot</p>
        <p className="mt-2 text-sm leading-6">{card.bio || "No public bio in the catalog."}</p>
        {session?.abstract && <p className="mt-3 text-sm leading-6 text-[#3f3a34]">{session.abstract}</p>}
      </section>

      <section className="mt-4 rounded-3xl border border-dashed border-line bg-card p-5 text-sm leading-6 text-mute">
        The full profile (work and education timeline, personality read, recent news, and a
        generated conversation plan) lands in the next pass. This page already shows the catalog
        facts and the graph path. Nothing here is a psychological diagnosis.
      </section>

      <ul className="mt-4 space-y-2 text-sm">
        {card.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} className="text-[#b33b12] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              {source.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link href={`/chat?person=${card.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
          Ask the agent
        </Link>
      </div>
    </div>
  );
}
