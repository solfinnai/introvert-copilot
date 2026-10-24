import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { recommend } from "@/lib/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function HomePage() {
  const meet = await recommend({ day: "both", metIds: [], limit: 1 });
  const person = meet.people[0];
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b33b12]">
            For the people who hate networking
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Walk into GitHub Universe knowing exactly what to say.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#3f3a34]">
            Pick the 3 people worth your energy. For each one you get a short plan: how to open,
            which part of your story will land with them, what to ask, and how to exit gracefully.
            Then a follow-up they will actually remember.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/meet" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">
              Try it as Henry Finn
            </Link>
            <p className="text-sm text-mute">No login. Your own private session.</p>
          </div>
        </section>
        {person && (
          <article className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                Preview: your plan for {person.name}
              </p>
              <span className="text-accent" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    d="M12 2.6l2.7 6.3 6.8.6-5.1 4.4 1.6 6.6L12 16.9 6 20.5l1.6-6.6L2.5 9.5l6.8-.6L12 2.6z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <PersonPhoto src={person.photoUrl} name={person.name} size={48} />
              <div>
                <p className="font-semibold">{person.name}</p>
                <p className="text-sm text-mute">{person.titleLine}</p>
              </div>
            </div>
            <blockquote className="mt-4 border-l-2 border-accent pl-3 font-serif text-lg leading-7">
              {person.opener}
            </blockquote>
            <p className="mt-3 text-sm leading-6 text-[#3f3a34]">{person.why}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-mute">
                Speaker catalog, fetched {meet.fetchedLabel}
              </p>
              <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
                Open full plan
              </Link>
            </div>
          </article>
        )}
      </div>
      <ol className="mt-12 grid gap-6 border-t border-line pt-6 md:grid-cols-3">
        <li>
          <p className="font-mono text-xs text-[#b33b12]">01</p>
          <Link href="/story" className="mt-1 block font-semibold">
            Your story
          </Link>
          <p className="text-sm text-mute">Say who you are in 10 seconds.</p>
        </li>
        <li>
          <p className="font-mono text-xs text-[#b33b12]">02</p>
          <Link href="/meet" className="mt-1 block font-semibold">
            Who to meet
          </Link>
          <p className="text-sm text-mute">Why each person, in plain words.</p>
        </li>
        <li>
          <p className="font-mono text-xs text-[#b33b12]">03</p>
          <Link href={person ? `/people/${person.id}` : "/meet"} className="mt-1 block font-semibold">
            Conversation plan
          </Link>
          <p className="text-sm text-mute">Opener, talking points, exit line.</p>
        </li>
      </ol>
    </div>
  );
}
