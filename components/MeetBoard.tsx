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
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="type-display text-[22px] leading-7 text-ink">3 people worth your energy</h1>
          <p className="measure mt-1 text-body leading-5 text-mute">
            Picked from {data.speakerCount} speakers for who you are, not just shared tags. Star the ones you want to talk to.
          </p>
          <Link href="/speakers" className="mt-2 inline-flex text-body text-accent hover:underline">
            Browse all speakers
          </Link>
        </div>
        <div className="inline-flex flex-wrap gap-1" role="group" aria-label="Day">
          {DAYS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={day === item.id}
              className={`btn ${day === item.id ? "btn-primary" : "btn-quiet"}`}
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

      <p className="measure mt-3 text-meta leading-4 text-faint">
        {backendLabel(data.backend)} walked you to a topic, then a session, then a speaker. People you mark as met stay out of this list.
        {metNote > 0 ? ` You have marked ${metNote} so far.` : ""}
      </p>
      {error && (
        <p className="mt-2 text-body text-ink" role="alert">
          {error}
        </p>
      )}

      <div className={loading ? "mt-3 opacity-60 transition-opacity duration-ui" : "mt-3"} aria-busy={loading}>
        {loading && <p className="mb-2 text-meta text-faint">Refreshing the list.</p>}
        {hero ? (
          <div className="panel divide-y divide-line">
            <MatchRow
              person={hero}
              response={data}
              topics={topics}
              open={openId === hero.id}
              locked={!ready}
              onTogglePath={() => setOpenId(openId === hero.id ? null : hero.id)}
              onMet={() => meetPerson(hero.id)}
            />
            {rest.map((person) => (
              <MatchRow
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
        ) : (
          <p className="panel px-3 py-4 text-body text-mute">Nobody on this day cleared the bar. Try both days.</p>
        )}
      </div>

      {!showAll && extra > 0 && (
        <button type="button" className="btn btn-quiet mt-3" onClick={() => setShowAll(true)}>
          {extra} more {extra === 1 ? "match" : "matches"}. Show more
        </button>
      )}
    </div>
  );
}

function MatchRow({ person, response, topics, open, locked, onTogglePath, onMet }: CardProps) {
  const topicsLine = [...new Set([...person.sharedTopics, ...person.sessionTopics])].filter(Boolean);
  const when = [person.dayLabel, person.startLabel, person.roomShort].filter(Boolean).join(", ");
  return (
    <article className="min-w-0 px-3 py-3">
      <header className="flex items-start gap-3">
        <PersonPhoto src={person.photoUrl} name={person.name} size={32} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-body font-medium">{person.name}</h2>
          <p className="break-words text-meta text-mute">{person.titleLine}</p>
          {when && <p className="mt-0.5 break-words text-meta text-faint">{when}</p>}
          {topicsLine.length > 0 && <p className="mt-0.5 break-words text-meta text-faint">{topicsLine.join(", ")}</p>}
        </div>
        <SaveButton person={toSaved(person)} />
      </header>
      <WhyCopy person={person} topics={topics} bodyClass="measure mt-2 text-body leading-5 text-ink" />
      <p className="mt-1 text-meta text-faint">Catch them: {person.catchLine}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Link href={`/agent?person=${person.id}`} className="btn">
          Ask agent
        </Link>
        <Link href={`/people/${person.id}`} className="btn btn-primary">
          Conversation plan
        </Link>
        <button type="button" className="btn btn-quiet" disabled={locked} onClick={onMet}>
          Mark as met
        </button>
        <button type="button" className="btn btn-quiet" aria-expanded={open} onClick={onTogglePath}>
          {open ? "Hide how we found this" : "How we found this"}
        </button>
      </div>
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
      {preview && <p className="measure mt-2 break-words text-body leading-5 text-mute">{preview}</p>}
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
