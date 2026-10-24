"use client";

import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { SaveButton } from "@/components/SaveButton";
import { useSession } from "@/components/session";
import { NEXT_STEPS } from "@/lib/saved";

export default function SavedPage() {
  const { state, ready, updateSaved } = useSession();
  const groups = new Map<string, string[]>();
  for (const person of state.saved) {
    if (!person.catchLine) continue;
    const names = groups.get(person.catchLine) ?? [];
    names.push(person.name.split(" ")[0]);
    groups.set(person.catchLine, names);
  }
  const clashes = [...groups.entries()].filter(([, names]) => names.length > 1);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-4xl tracking-tight">Who I want to talk to</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
            Saved on this browser only. Add a note and a next step so you remember why you walked over.
          </p>
        </div>
        <Link href="/meet" className="shrink-0 self-start rounded-full border border-line bg-white px-4 py-2 text-sm">
          Back to who to meet
        </Link>
      </div>

      {!ready ? (
        <p className="mt-8 text-sm text-mute">Loading this browser&apos;s list.</p>
      ) : state.saved.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-card px-6 py-10 text-center">
          <h2 className="font-serif text-2xl tracking-tight">Nobody on your list yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mute">
            Save people from Who to meet when you want a plan for the walk-over. Notes stay on this browser.
          </p>
          <Link href="/meet" className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            Find people to talk to
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {state.saved.map((person) => {
            const met = state.met.includes(person.id);
            return (
              <article key={person.id} className="min-w-0 rounded-3xl border border-line bg-card p-5">
                <div className="flex items-start gap-3">
                  <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-semibold">{person.name}</h2>
                    <p className="break-words text-sm text-mute">{person.titleLine}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {met && <span className="text-xs font-semibold text-[#b33b12]">Met</span>}
                    <SaveButton person={person} />
                  </div>
                </div>
                {person.opener && (
                  <p className="mt-3 break-words border-l-2 border-accent pl-3 text-sm leading-6">{person.opener}</p>
                )}
                {person.catchLine && <p className="mt-3 break-words text-sm text-mute">{person.catchLine}</p>}
                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-mute">
                  Next step
                  <select
                    value={person.nextStep}
                    className="mt-1 block w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
                    onChange={(event) => updateSaved(person.id, { nextStep: event.target.value })}
                  >
                    {NEXT_STEPS.map((step) => (
                      <option key={step} value={step}>
                        {step}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mute">
                  Note, only on this browser
                  <textarea
                    value={person.note}
                    maxLength={280}
                    rows={3}
                    placeholder="Ask about their talk after the session"
                    className="mt-1 block w-full min-w-0 resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-ink"
                    onChange={(event) => updateSaved(person.id, { note: event.target.value })}
                  />
                </label>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link
                    href={`/agent?person=${person.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-line px-3 py-1.5 text-sm"
                  >
                    Ask agent
                  </Link>
                  <Link
                    href={`/people/${person.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-ink px-3 py-1.5 text-sm text-white"
                  >
                    Conversation plan
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {clashes.map(([when, names]) => (
        <p key={when} className="mt-4 break-words rounded-2xl border border-[#f0d2c4] bg-[#fff7f3] px-4 py-3 text-sm leading-6">
          <span className="font-semibold uppercase tracking-[0.12em] text-[#b33b12]">Heads up. </span>
          {names.join(" and ")} are both at {when}. Pick one so you are not in two places.
        </p>
      ))}
    </div>
  );
}
