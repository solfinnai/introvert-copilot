"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraphPath, backendLabel } from "./GraphPath";
import { PersonPhoto } from "./PersonPhoto";
import { SaveButton } from "./SaveButton";
import { useSession, type SavedPerson } from "./session";
import type { DayFilter, MeetResponse, RankedPerson } from "@/lib/types";

const DAYS: { id: DayFilter; label: string }[] = [
  { id: "both", label: "Both days" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
];

export function MeetBoard({ initial }: { initial: MeetResponse }) {
  const { state, ready, markMet } = useSession();
  const [day, setDay] = useState<DayFilter>("both");
  const [data, setData] = useState(initial);
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metNote, setMetNote] = useState(0);

  useEffect(() => {
    if (!ready || state.met.length === 0) return;
    setMetNote(state.met.length);
    void reload(day, state.met);
    // Reload once when this browser's met list is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function reload(nextDay: DayFilter, met: string[]) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ day: nextDay });
      if (met.length) params.set("met", met.join(","));
      const res = await fetch(`/api/meet?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("refresh failed");
      const body = (await res.json()) as MeetResponse;
      setData(body);
    } catch {
      setError("The list did not refresh. Showing the last ranking we had.");
    } finally {
      setLoading(false);
    }
  }

  const visible = showAll ? data.people : data.people.slice(0, 3);
  const extra = Math.max(0, data.people.length - 3);
  const [hero, ...rest] = visible;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl tracking-tight text-ink md:text-5xl">
            3 people worth your energy
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#4a453e]">
            Picked from {data.speakerCount} speakers for who you are, not just shared tags. Star the
            ones you want to talk to.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-white p-1">
          {DAYS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${
                day === item.id ? "bg-ink text-white" : "text-[#3f3a34]"
              }`}
              onClick={() => {
                setDay(item.id);
                setShowAll(false);
                setOpenId(null);
                void reload(item.id, state.met);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-mute">
        {backendLabel(data.backend)} walked you to a topic, then a session, then a speaker
        {data.ms ? ` in ${data.ms} ms` : ""}. People you mark as met stay out of this list until you
        reset the demo.
        {metNote > 0 ? ` You have marked ${metNote} so far.` : ""}
      </p>
      {error && <p className="mt-3 text-sm text-[#9a3412]">{error}</p>}

      <div className={loading ? "mt-6 opacity-60" : "mt-6"}>
        {hero ? (
          <HeroCard
            person={hero}
            response={data}
            open={openId === hero.id}
            onTogglePath={() => setOpenId(openId === hero.id ? null : hero.id)}
            onMet={() => {
              const met = state.met.includes(hero.id) ? state.met : [...state.met, hero.id];
              markMet(hero.id);
              setMetNote(met.length);
              void reload(day, met);
            }}
          />
        ) : (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm">
            Nobody on this day cleared the bar. Try both days.
          </p>
        )}
        {rest.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {rest.map((person) => (
              <SmallCard
                key={person.id}
                person={person}
                response={data}
                open={openId === person.id}
                onTogglePath={() => setOpenId(openId === person.id ? null : person.id)}
                onMet={() => {
                  const met = state.met.includes(person.id) ? state.met : [...state.met, person.id];
                  markMet(person.id);
                  setMetNote(met.length);
                  void reload(day, met);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!showAll && extra > 0 && (
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-[#b33b12]"
          onClick={() => setShowAll(true)}
        >
          {extra} more {extra === 1 ? "match" : "matches"}. Show more
        </button>
      )}
    </div>
  );
}

function HeroCard({ person, response, open, onTogglePath, onMet }: CardProps) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-card md:p-6">
      <header className="flex items-start gap-4">
        <PersonPhoto src={person.photoUrl} name={person.name} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{person.name}</h2>
          <p className="text-sm text-mute">{person.titleLine}</p>
        </div>
        <SaveButton person={toSaved(person)} />
      </header>
      <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#2c2824]">{person.why}</p>
      <p className="mt-3 text-sm text-mute">Catch them: {person.catchLine}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/agent?person=${person.id}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm">
          Ask agent about {person.name.split(" ")[0]}
        </Link>
        <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
          Conversation plan
        </Link>
        <button type="button" className="px-2 text-sm text-mute underline-offset-2 hover:underline" onClick={onMet}>
          Mark as met
        </button>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-3 text-sm text-[#3f3a34]"
          aria-expanded={open}
          onClick={onTogglePath}
        >
          <span>{open ? "Hide the graph path" : "See the graph path"}</span>
          <span className="font-mono text-[11px] text-mute">
            {backendLabel(response.backend)}, {person.hops} hops, {response.ms} ms
          </span>
        </button>
      </div>
      {open && <PathBlock person={person} response={response} />}
    </article>
  );
}

function SmallCard({ person, response, open, onTogglePath, onMet }: CardProps) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-card">
      <header className="flex items-start gap-3">
        <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">{person.name}</h2>
          <p className="text-sm text-mute">{person.titleLine}</p>
        </div>
        <SaveButton person={toSaved(person)} />
      </header>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#2c2824]">{person.why}</p>
      <p className="mt-3 text-sm text-mute">Catch them: {person.catchLine}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/agent?person=${person.id}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm">
          Ask agent
        </Link>
        <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-3 py-1.5 text-sm text-white">
          Conversation plan
        </Link>
        <button type="button" className="text-sm text-mute underline-offset-2 hover:underline" onClick={onMet}>
          Mark as met
        </button>
      </div>
      <button type="button" className="mt-3 text-sm text-[#3f3a34]" aria-expanded={open} onClick={onTogglePath}>
        {open ? "Hide the graph path" : "See the graph path"}
        <span className="ml-2 font-mono text-[11px] text-mute">
          {backendLabel(response.backend)}, {person.hops} hops, {response.ms} ms
        </span>
      </button>
      {open && <PathBlock person={person} response={response} />}
    </article>
  );
}

function PathBlock({ person, response }: { person: RankedPerson; response: MeetResponse }) {
  return (
    <GraphPath
      path={person.path}
      introPath={person.introPath}
      introName={person.introVia?.name ?? null}
      hops={person.hops}
      ms={response.ms}
      backend={response.backend}
      cypher={response.cypher}
      keywordHits={person.keywordHits}
      fetchedLabel={response.fetchedLabel}
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
    note: "",
    nextStep: "Ask about their talk",
  };
}

interface CardProps {
  person: RankedPerson;
  response: MeetResponse;
  open: boolean;
  onTogglePath: () => void;
  onMet: () => void;
}
