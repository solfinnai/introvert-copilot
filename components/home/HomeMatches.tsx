"use client";

import Link from "next/link";
import { useState } from "react";
import { PersonNameLink, PersonPhotoLink, rememberPersonReturn } from "@/components/person-return";
import { SaveButton } from "@/components/SaveButton";
import { useSession } from "@/components/session";
import {
  firstSentence,
  groupHomeMatches,
  shownCount,
  splitHomeMatches,
  type HomeMatch,
} from "@/lib/home-matches";

export function HomeMatches({
  people,
  speakerCount,
  onRunAgain,
}: {
  people: HomeMatch[];
  speakerCount: number;
  onRunAgain: () => void;
}) {
  const { ready, markMet, state } = useSession();
  const [hidden, setHidden] = useState<string[]>([]);
  const met = new Set([...state.met, ...hidden]);
  const visible = people.filter((person) => !met.has(person.id));
  const parts = splitHomeMatches(visible);
  const groups = groupHomeMatches(parts.also);
  const shown = shownCount(visible);

  function meet(id: string) {
    if (!ready) return;
    markMet(id);
    setHidden((current) => (current.includes(id) ? current : [...current, id]));
  }

  return (
    <div className="mt-4" data-testid="home-results">
      <p className="text-body text-ink">
        Showing {shown} of {speakerCount} speakers ranked for you
      </p>
      <p className="mt-1 flex flex-col gap-1 text-body sm:flex-row sm:flex-wrap sm:gap-x-4">
        <Link href="/speakers" className="text-accent hover:underline">
          Browse all {speakerCount} speakers
        </Link>
        <Link href="/meet" className="text-accent hover:underline">
          Open the full Who to meet
        </Link>
        <button type="button" className="btn btn-quiet h-auto self-start px-0" onClick={onRunAgain}>
          Run it again
        </button>
      </p>

      <section className="mt-5" aria-labelledby="top-matches">
        <h2 id="top-matches" className="type-display text-[18px] leading-6">
          Top matches
        </h2>
        <p className="mt-1 text-meta text-faint">The highest scores, with the reason each one ranked.</p>
        {parts.top.length === 0 ? (
          <p className="panel mt-3 px-3 py-4 text-body text-mute">No top matches left in this pass.</p>
        ) : (
          <div className="panel mt-3 divide-y divide-line">
            {parts.top.map((person) => (
              <MatchCard key={person.id} person={person} why={person.why} locked={!ready} onMet={() => meet(person.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="strong-matches">
        <h2 id="strong-matches" className="type-display text-[18px] leading-6">
          Strong matches
        </h2>
        <ul className="panel mt-3 divide-y divide-line">
          {parts.strong.map((person) => (
            <li key={person.id}>
              <MatchCard
                person={person}
                why={firstSentence(person.why)}
                compact
                locked={!ready}
                onMet={() => meet(person.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="also-matches">
        <h2 id="also-matches" className="type-display text-[18px] leading-6">
          Also worth meeting
        </h2>
        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <section key={group.theme} aria-label={group.theme}>
              <h3 className="text-meta text-faint">{group.theme}</h3>
              <ul className="panel mt-1 divide-y divide-line">
                {group.people.map((person) => (
                  <li key={person.id}>
                    <MatchCard
                      person={person}
                      why={firstSentence(person.why)}
                      compact
                      locked={!ready}
                      onMet={() => meet(person.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function MatchCard({
  person,
  why,
  compact = false,
  locked,
  onMet,
}: {
  person: HomeMatch;
  why: string;
  compact?: boolean;
  locked: boolean;
  onMet: () => void;
}) {
  return (
    <article className={compact ? "px-3 py-2" : "px-3 py-3"}>
      <header className="flex items-start gap-3">
        <PersonPhotoLink id={person.id} name={person.name} src={person.photoUrl} size={compact ? 28 : 32} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-body font-medium">
            <PersonNameLink id={person.id} name={person.name} />
          </h3>
          <p className="break-words text-meta text-mute">{person.titleLine}</p>
        </div>
        <SaveButton
          person={{
            id: person.id,
            name: person.name,
            titleLine: person.titleLine,
            photoUrl: person.photoUrl,
            opener: person.opener,
            catchLine: person.catchLine,
            note: "",
            nextStep: "Ask about their talk",
          }}
        />
      </header>
      {why ? <p className="measure mt-2 break-words text-body leading-5 text-ink">{why}</p> : null}
      {person.catchLine ? <p className="mt-1 break-words text-meta text-faint">Catch them: {person.catchLine}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Link href={`/agent?person=${person.id}`} className="btn">
          Ask agent
        </Link>
        <Link href={`/people/${person.id}`} className="btn btn-primary" onClick={rememberPersonReturn}>
          Conversation plan
        </Link>
        <button type="button" className="btn btn-quiet" disabled={locked} onClick={onMet}>
          Mark as met
        </button>
      </div>
    </article>
  );
}
