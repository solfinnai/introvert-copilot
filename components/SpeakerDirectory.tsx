"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PersonPhoto } from "./PersonPhoto";
import { SaveButton } from "./SaveButton";
import {
  SPEAKER_PAGE_SIZE,
  agentHref,
  directoryCatchLine,
  directoryOpener,
  formatSessionLine,
  paginate,
  personHref,
  querySpeakers,
  reportHref,
  sessionsOnDay,
  type DirectorySpeaker,
  type SpeakerDay,
  type SpeakerSort,
} from "@/lib/speakers";

const DAYS: { id: SpeakerDay; label: string }[] = [
  { id: "all", label: "All days" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
];

const SORTS: { id: SpeakerSort; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "company", label: "Company" },
  { id: "time", label: "Day and time" },
];

export function SpeakerDirectory({ speakers, topics }: { speakers: DirectorySpeaker[]; topics: string[] }) {
  const [q, setQ] = useState("");
  const [day, setDay] = useState<SpeakerDay>("all");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState<SpeakerSort>("name");
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => querySpeakers(speakers, { q, day, topic, sort }), [speakers, q, day, topic, sort]);
  const view = paginate(filtered, page, SPEAKER_PAGE_SIZE);
  const filteredView = q.trim() || day !== "all" || topic || sort !== "name";

  function resetPage() {
    setPage(1);
  }

  function goTo(next: number) {
    setPage(next);
    listRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <h1 className="font-serif text-4xl tracking-tight">All speakers</h1>
        <p className="mt-3 text-base leading-7 text-[#4a453e]">
          {speakers.length} people from the GitHub Universe catalog. Search by name, company, or topic, then
          filter by day. Photos, times, and rooms come from that list.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <label className="block min-w-0">
          <span className="sr-only">Search speakers</span>
          <input
            type="search"
            value={q}
            placeholder="Search name, company, or topic"
            autoComplete="off"
            className="w-full min-w-0 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm"
            onChange={(event) => {
              setQ(event.target.value);
              resetPage();
            }}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex max-w-full flex-wrap rounded-full border border-line bg-white p-1">
            {DAYS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={day === item.id}
                className={`rounded-full px-3 py-1.5 text-sm ${day === item.id ? "bg-ink text-white" : "text-[#3f3a34]"}`}
                onClick={() => {
                  setDay(item.id);
                  resetPage();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="min-w-0 text-sm text-mute">
            <span className="sr-only">Topic</span>
            <select
              value={topic}
              className="w-full min-w-0 rounded-full border border-line bg-white px-3 py-2 text-sm text-ink sm:max-w-[16rem]"
              onChange={(event) => {
                setTopic(event.target.value);
                resetPage();
              }}
            >
              <option value="">All topics</option>
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-sm text-mute">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              className="w-full min-w-0 rounded-full border border-line bg-white px-3 py-2 text-sm text-ink sm:w-auto"
              onChange={(event) => {
                setSort(event.target.value as SpeakerSort);
                resetPage();
              }}
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  Sort: {item.label}
                </option>
              ))}
            </select>
          </label>
          {filteredView && (
            <button
              type="button"
              className="self-start text-sm font-semibold text-[#b33b12]"
              onClick={() => {
                setQ("");
                setDay("all");
                setTopic("");
                setSort("name");
                resetPage();
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-mute" aria-live="polite">
        {view.total === 0
          ? "No speakers match that search."
          : `Showing ${view.start} to ${view.end} of ${view.total}.`}
      </p>

      <div ref={listRef} className="mt-4 space-y-3">
        {view.total === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-10 text-center">
            <h2 className="font-serif text-2xl tracking-tight">No matching speakers</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mute">
              Try another name, company, or topic. Clear the day filter if you want the full catalog.
            </p>
          </div>
        ) : (
          view.rows.map((speaker) => <SpeakerCard key={speaker.id} speaker={speaker} day={day} />)
        )}
      </div>

      {view.pages > 1 && (
        <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Speaker pages">
          <button
            type="button"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm disabled:opacity-40"
            disabled={view.page <= 1}
            onClick={() => goTo(view.page - 1)}
          >
            Previous
          </button>
          <p className="text-sm text-mute">
            Page {view.page} of {view.pages}
          </p>
          <button
            type="button"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm disabled:opacity-40"
            disabled={view.page >= view.pages}
            onClick={() => goTo(view.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

function SpeakerCard({ speaker, day }: { speaker: DirectorySpeaker; day: SpeakerDay }) {
  const sessions = sessionsOnDay(speaker, day);
  const topics = [...new Set(sessions.flatMap((session) => session.topics))];
  return (
    <article className="min-w-0 rounded-3xl border border-line bg-card p-4 sm:p-5" data-speaker-id={speaker.id}>
      <div className="flex items-start gap-3">
        <PersonPhoto src={speaker.photoUrl} name={speaker.name} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-semibold tracking-tight">
            <Link href={personHref(speaker.id)} className="hover:underline">
              {speaker.name}
            </Link>
          </h2>
          <p className="break-words text-sm text-mute">{speaker.titleLine || "Title and company not listed"}</p>
        </div>
        <SaveButton
          person={{
            id: speaker.id,
            name: speaker.name,
            titleLine: speaker.titleLine,
            photoUrl: speaker.photoUrl,
            opener: directoryOpener(speaker),
            catchLine: directoryCatchLine(speaker),
          }}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {sessions.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line px-3 py-2 text-sm leading-6">
            No session is listed in the catalog.
          </li>
        ) : (
          sessions.map((session, index) => (
            <li key={`${speaker.id}-${session.dayKey}-${index}`} className="min-w-0 rounded-2xl bg-[#faf7f2] px-3 py-2">
              <p className="break-words text-sm font-medium">{session.title || "Session title not listed"}</p>
              <p className="break-words text-sm leading-6 text-mute">{formatSessionLine(session)}</p>
              {session.type ? <p className="text-xs text-mute">{session.type}</p> : null}
            </li>
          ))
        )}
      </ul>
      {topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {topics.map((item) => (
            <li key={item} className="max-w-full break-words rounded-full bg-[#f6efe4] px-2.5 py-1 text-xs text-[#3f3a34]">
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={agentHref(speaker.id)}
          className="inline-flex items-center justify-center rounded-full border border-line bg-white px-3 py-1.5 text-sm"
        >
          Ask agent
        </Link>
        <Link
          href={personHref(speaker.id)}
          className="inline-flex items-center justify-center rounded-full border border-line bg-white px-3 py-1.5 text-sm"
        >
          Person page
        </Link>
        <Link
          href={reportHref(speaker.id)}
          className="inline-flex items-center justify-center rounded-full bg-ink px-3 py-1.5 text-sm text-white"
        >
          Get full report
        </Link>
      </div>
    </article>
  );
}
