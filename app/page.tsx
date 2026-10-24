import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { loadDemoCard } from "@/lib/demo-card";
import { recommendFromMemory } from "@/lib/graph";
import { HOME_ENTRIES, HOME_LINE, sampleWhyLines } from "@/lib/home";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const demo = loadDemoCard();
const whyPeople = sampleWhyLines(recommendFromMemory({ day: "both", metIds: [], limit: 3 }).people);

export default function HomePage() {
  const people = whyPeople;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-meta text-mute">For introverts at the conference</p>
      <h1 className="type-display measure mt-2 text-[28px] leading-8 text-ink">{HOME_LINE}</h1>

      <article className="panel mt-6 flex items-start gap-3 p-3">
        <PersonPhoto src={demo.photo} name={demo.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-meta text-faint">Demo user</p>
          <h2 className="type-display mt-0.5 break-words text-[18px] leading-6">{demo.name}</h2>
          {demo.headline ? <p className="mt-1 break-words text-body text-mute">{demo.headline}</p> : null}
          {demo.story ? <p className="measure mt-2 break-words text-body leading-5 text-ink">{demo.story}</p> : null}
          {demo.linkedin ? (
            <a
              href={demo.linkedin}
              className="mt-2 inline-block break-all text-body text-accent underline-offset-2 hover:underline"
            >
              Public LinkedIn profile
            </a>
          ) : null}
        </div>
      </article>

      <nav aria-label="Start here" className="panel mt-3">
        <ul className="divide-y divide-line">
          {HOME_ENTRIES.map((entry) => (
            <li key={entry.href}>
              <Link href={entry.href} className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 transition-colors duration-ui hover:bg-fill sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-body font-medium">{entry.title}</span>
                <span className="text-meta text-mute sm:text-right">{entry.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-8" aria-labelledby="why-heading">
        <h2 id="why-heading" className="type-display text-[18px] leading-6">
          Why you should meet
        </h2>
        <p className="measure mt-1 text-meta text-mute">
          Three lines from the ranking for this demo, taken from the GitHub Universe graph.
        </p>
        {people.length === 0 ? (
          <p className="panel mt-3 px-3 py-4 text-body text-mute">
            The ranking is quiet right now. Who to meet will try the list again.
          </p>
        ) : (
          <ol className="panel mt-3 divide-y divide-line">
            {people.map((person) => (
              <li key={person.id}>
                <Link href={`/people/${person.id}`} className="flex items-start gap-3 px-3 py-2.5 transition-colors duration-ui hover:bg-fill">
                  <PersonPhoto src={person.photoUrl} name={person.name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-body font-medium">{person.name}</span>
                    <span className="block break-words text-meta text-mute">{person.titleLine}</span>
                    <span className="measure mt-1 block break-words text-body leading-5 text-ink">{person.why}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
