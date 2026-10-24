"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GraphPath, backendLabel } from "./GraphPath";
import { PersonPhoto } from "./PersonPhoto";
import { SaveButton } from "./SaveButton";
import { useSession, type SavedPerson } from "./session";
import { accumulateMet, isLatestRequest, nextRequestId } from "@/lib/latest-request";
import { leadWith, readStoredTopics, TALK_TOPICS_KEY } from "@/lib/talk-topics";
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
  const [topics, setTopics] = useState<string[] | null>(null);
  const latestRequest = useRef(0);
  const metRef = useRef<string[]>([]);
  const topicsRef = useRef<string[]>([]);

  useEffect(() => {
    metRef.current = state.met;
  }, [state.met]);

  useEffect(() => {
    if (!ready) return;
    let nextTopics: string[] = [];
    try {
      nextTopics = readStoredTopics(window.localStorage.getItem(TALK_TOPICS_KEY));
    } catch {
      nextTopics = readStoredTopics(null);
    }
    topicsRef.current = nextTopics;
    setTopics(nextTopics);
    setMetNote(state.met.length);
    if (state.met.length === 0) return;
    void reload(day, metRef.current, nextTopics);
    // The cards already draw a lead from saved topics. Reload only to drop people already met.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function reload(nextDay: DayFilter, met: string[], talkTopics = topicsRef.current) {
    const requestId = nextRequestId(latestRequest.current);
    latestRequest.current = requestId;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ day: nextDay });
      if (met.length) params.set("met", met.join(","));
      if (talkTopics.length) params.set("topics", talkTopics.join("|"));
      const res = await fetch(`/api/meet?${params.toString()}`, { cache: "no-store" });
      if (!isLatestRequest(latestRequest.current, requestId)) return;
      if (!res.ok) throw new Error("refresh failed");
      const body = (await res.json()) as MeetResponse;
      if (!isLatestRequest(latestRequest.current, requestId)) return;
      setData(body);
    } catch {
      if (!isLatestRequest(latestRequest.current, requestId)) return;
      setError("The list did not refresh. Showing the last ranking we had.");
    } finally {
      if (isLatestRequest(latestRequest.current, requestId)) setLoading(false);
    }
  }

  function meetPerson(id: string) {
    if (!ready) return;
    const met = accumulateMet(metRef.current, id);
    metRef.current = met;
    markMet(id);
    setMetNote(met.length);
    void reload(day, met);
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
                void reload(item.id, metRef.current);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-5 text-mute">
        {backendLabel(data.backend)} walked you to a topic, then a session, then a speaker. People you
        mark as met stay out of this list until you reset the demo.
        {metNote > 0 ? ` You have marked ${metNote} so far.` : ""}
      </p>
      {error && <p className="mt-3 text-sm text-[#9a3412]">{error}</p>}

      <div className={loading ? "mt-6 opacity-60" : "mt-6"}>
        {hero ? (
          <HeroCard
            person={hero}
            response={data}
            topics={topics}
            open={openId === hero.id}
            locked={!ready}
            onTogglePath={() => setOpenId(openId === hero.id ? null : hero.id)}
            onMet={() => meetPerson(hero.id)}
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
                topics={topics}
                open={openId === person.id}
                locked={!ready}
                onTogglePath={() => setOpenId(openId === person.id ? null : person.id)}
                onMet={() => meetPerson(person.id)}
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

function HeroCard({ person, response, topics, open, locked, onTogglePath, onMet }: CardProps) {
  return (
    <article className="min-w-0 rounded-3xl border border-line bg-card p-5 shadow-card md:p-6">
      <header className="flex items-start gap-4">
        <PersonPhoto src={person.photoUrl} name={person.name} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{person.name}</h2>
          <p className="text-sm text-mute">{person.titleLine}</p>
        </div>
        <SaveButton person={toSaved(person)} />
      </header>
      <WhyCopy person={person} topics={topics} bodyClass="mt-4 max-w-3xl text-[15px] leading-7 text-[#2c2824]" />
      <p className="mt-3 text-sm text-mute">Catch them: {person.catchLine}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/agent?person=${person.id}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm">
          Ask agent about {person.name.split(" ")[0]}
        </Link>
        <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
          Conversation plan
        </Link>
        <button
          type="button"
          className="px-2 text-sm text-mute underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
          disabled={locked}
          onClick={onMet}
        >
          Mark as met
        </button>
      </div>
      <button
        type="button"
        className="mt-3 block max-w-full text-left text-sm text-[#3f3a34]"
        aria-expanded={open}
        onClick={onTogglePath}
      >
        {open ? "Hide how we found this" : "How we found this"}
      </button>
      {open && <PathBlock person={person} response={response} />}
    </article>
  );
}

function SmallCard({ person, response, topics, open, locked, onTogglePath, onMet }: CardProps) {
  return (
    <article className="min-w-0 rounded-3xl border border-line bg-card p-5 shadow-card">
      <header className="flex items-start gap-3">
        <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">{person.name}</h2>
          <p className="text-sm text-mute">{person.titleLine}</p>
        </div>
        <SaveButton person={toSaved(person)} />
      </header>
      <WhyCopy person={person} topics={topics} bodyClass="mt-3 line-clamp-4 text-sm leading-6 text-[#2c2824]" />
      <p className="mt-3 text-sm text-mute">Catch them: {person.catchLine}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/agent?person=${person.id}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm">
          Ask agent
        </Link>
        <Link href={`/people/${person.id}`} className="rounded-full bg-ink px-3 py-1.5 text-sm text-white">
          Conversation plan
        </Link>
        <button
          type="button"
          className="text-sm text-mute underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
          disabled={locked}
          onClick={onMet}
        >
          Mark as met
        </button>
      </div>
      <button
        type="button"
        className="mt-3 block max-w-full text-left text-sm text-[#3f3a34]"
        aria-expanded={open}
        onClick={onTogglePath}
      >
        {open ? "Hide how we found this" : "How we found this"}
      </button>
      {open && <PathBlock person={person} response={response} />}
    </article>
  );
}

function PathBlock({ person, response }: { person: RankedPerson; response: MeetResponse }) {
  return (
    <GraphPath
      name={person.name}
      sessionTitle={person.sessionTitle}
      sessionType={person.sessionType}
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

function WhyCopy({
  person,
  topics,
  bodyClass,
}: {
  person: RankedPerson;
  topics: string[] | null;
  bodyClass: string;
}) {
  const parts = whyParts(person.why);
  const preview =
    parts.lead ||
    (topics
      ? leadWith({
          chips: topics,
          bio: person.bio,
          keywordHits: person.keywordHits,
          sessions: person.sessionTitle ? [{ title: person.sessionTitle, topics: person.sessionTopics }] : [],
        })
      : null);
  return (
    <>
      <p className={bodyClass}>{parts.body}</p>
      {preview && <p className="mt-3 break-words text-sm leading-6 text-[#3f3a34]">{preview}</p>}
    </>
  );
}

function whyParts(why: string): { body: string; lead: string | null } {
  const at = why.indexOf("Lead with:");
  if (at < 0) return { body: why, lead: null };
  return { body: why.slice(0, at).trim(), lead: why.slice(at).trim() };
}

interface CardProps {
  person: RankedPerson;
  response: MeetResponse;
  topics: string[] | null;
  open: boolean;
  locked: boolean;
  onTogglePath: () => void;
  onMet: () => void;
}
