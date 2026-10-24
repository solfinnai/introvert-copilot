"use client";

import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { SaveButton } from "@/components/SaveButton";
import { useSession } from "@/components/session";
import { NEXT_STEPS } from "@/lib/saved";
import {
  agentHref,
  buildSchedule,
  formatTimePlace,
  personHref,
  reportHref,
  type DirectorySpeaker,
} from "@/lib/speakers";

export function SavedBoard({ speakers }: { speakers: DirectorySpeaker[] }) {
  const { state, ready, updateSaved } = useSession();
  const groups = new Map<string, string[]>();
  for (const person of state.saved) {
    if (!person.catchLine) continue;
    const names = groups.get(person.catchLine) ?? [];
    names.push(person.name.split(" ")[0]);
    groups.set(person.catchLine, names);
  }
  const clashes = [...groups.entries()].filter(([, names]) => names.length > 1);
  const schedule = buildSchedule(
    speakers,
    state.saved.map((person) => ({ id: person.id, name: person.name })),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="type-display break-words text-[22px] leading-7">Who I want to talk to</h1>
          <p className="measure mt-1 text-body leading-5 text-mute">
            Saved on this browser only. Add a note and a next step so you remember why you walked over.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 self-start">
          <Link href="/speakers" className="btn">
            Browse all speakers
          </Link>
          <Link href="/meet" className="btn btn-quiet">
            Back to who to meet
          </Link>
        </div>
      </div>

      {!ready ? (
        <section className="panel mt-4 p-3" aria-busy="true" aria-label="Loading saved people">
          <p className="text-meta font-medium text-mute">Saved people</p>
          <p className="mt-1 text-meta text-faint">Loading this browser&apos;s list.</p>
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="skel h-3 w-2/3" />
            <div className="skel h-3 w-full" />
            <div className="skel h-3 w-5/6" />
          </div>
        </section>
      ) : state.saved.length === 0 ? (
        <div className="panel mt-4 px-3 py-6">
          <h2 className="type-display text-[18px] leading-6">Nobody on your list yet</h2>
          <p className="measure mt-1 text-body leading-5 text-mute">
            Save people from Who to meet when you want a plan for the walk-over. Notes stay on this browser.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href="/meet" className="btn btn-primary">
              Find people to talk to
            </Link>
            <Link href="/speakers" className="btn">
              Browse all speakers
            </Link>
          </div>
        </div>
      ) : (
        <>
          <Schedule days={schedule.days} missing={schedule.missing} />
          <div className="panel mt-3 divide-y divide-line">
            {state.saved.map((person) => {
              const met = state.met.includes(person.id);
              return (
                <article key={person.id} className="min-w-0 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <PersonPhoto src={person.photoUrl} name={person.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-body font-medium">{person.name}</h2>
                      <p className="break-words text-meta text-mute">{person.titleLine}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {met && <span className="text-meta text-accent">Met</span>}
                      <SaveButton person={person} />
                    </div>
                  </div>
                  {person.opener && (
                    <p className="measure mt-2 break-words border-l border-accent pl-3 text-body leading-5">{person.opener}</p>
                  )}
                  {person.catchLine && <p className="mt-2 break-words text-meta text-faint">{person.catchLine}</p>}
                  <label className="mt-3 block text-meta text-mute">
                    Next step
                    <select
                      value={person.nextStep}
                      className="field mt-1"
                      onChange={(event) => updateSaved(person.id, { nextStep: event.target.value })}
                    >
                      {NEXT_STEPS.map((step) => (
                        <option key={step} value={step}>
                          {step}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block text-meta text-mute">
                    Note, only on this browser
                    <textarea
                      value={person.note}
                      maxLength={280}
                      rows={3}
                      aria-label={`Note for ${person.name}`}
                      className="field mt-1 resize-y"
                      onChange={(event) => updateSaved(person.id, { note: event.target.value })}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link href={agentHref(person.id)} className="btn">
                      Ask agent
                    </Link>
                    <Link href={personHref(person.id)} className="btn">
                      Person page
                    </Link>
                    <Link href={reportHref(person.id)} className="btn btn-primary">
                      Get full report
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {clashes.map(([when, names]) => (
        <p key={when} className="panel mt-3 break-words px-3 py-2 text-body leading-5">
          <span className="font-medium">Heads up. </span>
          {names.join(" and ")} are both at {when}. Pick one so you are not in two places.
        </p>
      ))}
    </div>
  );
}

function Schedule({
  days,
  missing,
}: {
  days: ReturnType<typeof buildSchedule>["days"];
  missing: { id: string; name: string }[];
}) {
  if (!days.length && !missing.length) return null;
  return (
    <section className="panel mt-4 min-w-0 p-3">
      <h2 className="type-display text-[18px] leading-6">Where to find them</h2>
      <p className="measure mt-1 text-body leading-5 text-mute">
        Day by day from the catalog, with the room and venue when the list has them. A clash means two people you saved start at the same time.
      </p>
      <div className="mt-3 space-y-4">
        {days.map((day) => (
          <div key={day.dayKey} className="min-w-0">
            <h3 className="text-body font-medium">{day.label}</h3>
            <ul className="mt-1 divide-y divide-line border-t border-line">
              {day.stops.map((stop, index) => (
                <li key={`${stop.personId}-${stop.dayKey}-${index}`} className={`min-w-0 py-2 ${stop.conflict ? "bg-raised" : ""}`}>
                  <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <Link href={personHref(stop.personId)} className="min-w-0 break-words text-body font-medium text-accent hover:underline">
                      {stop.name}
                    </Link>
                    <p className="min-w-0 break-words text-meta text-faint sm:text-right">{formatTimePlace(stop)}</p>
                  </div>
                  <p className="mt-0.5 break-words text-meta text-mute">{stop.sessionTitle}</p>
                </li>
              ))}
            </ul>
            {day.conflicts.map((conflict) => (
              <p key={conflict.note} className="mt-1 break-words text-meta leading-4 text-ink">
                {conflict.note}
              </p>
            ))}
          </div>
        ))}
      </div>
      {missing.map((person) => (
        <p key={person.id} className="mt-2 break-words text-meta leading-4 text-faint">
          No catalog session for {person.name}. Their card is still on this list.
        </p>
      ))}
    </section>
  );
}
