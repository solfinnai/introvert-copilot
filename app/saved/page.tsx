"use client";

import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { useSession } from "@/components/session";

export default function SavedPage() {
  const { state, ready } = useSession();
  const groups = new Map<string, string[]>();
  for (const person of state.saved) {
    const names = groups.get(person.catchLine) ?? [];
    names.push(person.name.split(" ")[0]);
    groups.set(person.catchLine, names);
  }
  const clashes = [...groups.entries()].filter(([, names]) => names.length > 1);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Saved: people you want to talk to</h1>
          <p className="mt-2 text-sm text-mute">
            Your opener for each one, so you can glance at it right before you walk over.
          </p>
        </div>
        <Link href="/meet" className="rounded-full border border-line bg-white px-4 py-2 text-sm">
          Back to who to meet
        </Link>
      </div>
      {!ready ? (
        <p className="mt-8 text-sm text-mute">Loading this browser&apos;s shortlist.</p>
      ) : state.saved.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-line bg-card p-6 text-sm">
          Nobody saved yet. Star a person on Who to meet and they will show up here.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {state.saved.map((person) => {
            const met = state.met.includes(person.id);
            return (
              <article key={person.id} className="rounded-3xl border border-line bg-card p-5">
                <div className="flex items-start gap-3">
                  <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{person.name}</h2>
                    <p className="text-sm text-mute">{person.titleLine}</p>
                  </div>
                  {met && <span className="text-xs font-semibold text-[#b33b12]">Met</span>}
                </div>
                <p className="mt-3 border-l-2 border-accent pl-3 text-sm leading-6">{person.opener}</p>
                <p className="mt-3 text-sm text-mute">{person.catchLine}</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/chat?person=${person.id}`} className="rounded-full border border-line px-3 py-1.5 text-sm">
                    Ask agent
                  </Link>
                  <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-3 py-1.5 text-sm text-white">
                    Conversation plan
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {clashes.map(([when, names]) => (
        <p key={when} className="mt-4 rounded-2xl border border-[#f0d2c4] bg-[#fff7f3] px-4 py-3 text-sm">
          <span className="font-semibold uppercase tracking-[0.12em] text-[#b33b12]">Heads up. </span>
          {names.join(" and ")} are both at {when}. Pick one so you are not in two places.
        </p>
      ))}
    </div>
  );
}
