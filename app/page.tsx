import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { loadDemoCard } from "@/lib/demo-card";
import { recommend } from "@/lib/graph";
import { HOME_ENTRIES, HOME_LINE, sampleWhyLines } from "@/lib/home";
import { logBackend, safeError } from "@/lib/redact";
import type { RankedPerson } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function HomePage() {
  const people = await loadWhyLines();
  const demo = loadDemoCard();
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b33b12]">
        For introverts at the conference
      </p>
      <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-snug tracking-tight text-ink sm:text-4xl sm:leading-tight lg:text-5xl">
        {HOME_LINE}
      </h1>

      <article className="mt-8 flex items-start gap-4 rounded-3xl border border-line bg-card p-5 shadow-card">
        <PersonPhoto src={demo.photo} name={demo.name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Demo user</p>
          <h2 className="mt-1 break-words font-serif text-2xl tracking-tight">{demo.name}</h2>
          {demo.headline ? (
            <p className="mt-1 break-words text-sm leading-6 text-mute">{demo.headline}</p>
          ) : null}
          {demo.story ? (
            <p className="mt-2 max-w-xl break-words text-[15px] leading-7 text-[#3f3a34]">{demo.story}</p>
          ) : null}
          {demo.linkedin ? (
            <a
              href={demo.linkedin}
              className="mt-2 inline-block break-all text-sm text-[#b33b12] underline decoration-[#f6d2c2] underline-offset-4 hover:decoration-[#b33b12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Public LinkedIn profile
            </a>
          ) : null}
        </div>
      </article>

      <nav aria-label="Start here" className="mt-4">
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {HOME_ENTRIES.map((entry) => (
            <li key={entry.href} className="min-w-0">
              <Link
                href={entry.href}
                className="flex h-full min-w-0 flex-col rounded-3xl border border-line bg-card p-5 shadow-card hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="break-words font-serif text-xl tracking-tight">{entry.title}</span>
                <span className="mt-2 break-words text-sm leading-6 text-[#4a453e]">{entry.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-10" aria-labelledby="why-heading">
        <h2 id="why-heading" className="font-serif text-2xl tracking-tight">
          Why you should meet
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
          Three lines from the ranking for this demo, taken from the GitHub Universe graph.
        </p>
        {people.length === 0 ? (
          <p className="mt-4 rounded-3xl border border-dashed border-line bg-card px-5 py-6 text-sm leading-6 text-mute">
            The ranking is quiet right now. Who to meet will try the list again.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {people.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/people/${person.id}`}
                  className="block rounded-3xl border border-line bg-card p-5 shadow-card hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex items-start gap-3">
                    <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold tracking-tight">{person.name}</p>
                      <p className="break-words text-sm text-mute">{person.titleLine}</p>
                      <p className="mt-2 break-words text-sm leading-6 text-[#2c2824]">{person.why}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

async function loadWhyLines(): Promise<RankedPerson[]> {
  try {
    const meet = await recommend({ day: "both", metIds: [], limit: 3 });
    return sampleWhyLines(meet.people);
  } catch (err) {
    logBackend("memory", `home ranking failed: ${safeError(err)}`);
    return [];
  }
}
