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
    <div className="mx-auto max-w-4xl">
      <h1 className="type-display text-[22px] leading-7">All speakers</h1>
      <p className="measure mt-1 text-body leading-5 text-mute">
        {speakers.length} people from the GitHub Universe catalog. Search by name, company, or topic, then filter by day. Photos, times, and rooms come from that list.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="block min-w-0">
          <span className="mb-1 block text-meta text-mute">Search</span>
          <input
            type="search"
            value={q}
            aria-label="Search speakers"
            autoComplete="off"
            className="field"
            onChange={(event) => {
              setQ(event.target.value);
              resetPage();
            }}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="inline-flex max-w-full flex-wrap gap-1" role="group" aria-label="Day">
            {DAYS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={day === item.id}
                className={`btn ${day === item.id ? "btn-primary" : "btn-quiet"}`}
                onClick={() => {
                  setDay(item.id);
                  resetPage();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="min-w-0 text-meta text-mute">
            <span className="mb-1 block">Topic</span>
            <select
              value={topic}
              className="field sm:max-w-[16rem]"
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
          <label className="min-w-0 text-meta text-mute">
            <span className="mb-1 block">Sort</span>
            <select
              value={sort}
              className="field sm:w-auto"
              onChange={(event) => {
                setSort(event.target.value as SpeakerSort);
                resetPage();
              }}
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {filteredView && (
            <button
              type="button"
              className="btn btn-quiet self-start sm:self-end"
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

      <p className="mt-3 text-meta text-faint" aria-live="polite">
        {view.total === 0 ? "No speakers match that search." : `Showing ${view.start} to ${view.end} of ${view.total}.`}
      </p>

      <div ref={listRef} className="mt-2">
        {view.total === 0 ? (
          <div className="panel px-3 py-6">
            <h2 className="type-display text-[18px] leading-6">No matching speakers</h2>
            <p className="measure mt-1 text-body leading-5 text-mute">
              Try another name, company, or topic. Clear the day filter if you want the full catalog.
            </p>
          </div>
        ) : (
          <div className="panel divide-y divide-line">
            {view.rows.map((speaker) => (
              <SpeakerCard key={speaker.id} speaker={speaker} day={day} />
            ))}
          </div>
        )}
      </div>

      {view.pages > 1 && (
        <nav className="mt-3 flex flex-wrap items-center justify-between gap-2" aria-label="Speaker pages">
          <button type="button" className="btn" disabled={view.page <= 1} onClick={() => goTo(view.page - 1)}>
            Previous
          </button>
          <p className="text-meta text-faint">
            Page {view.page} of {view.pages}
          </p>
          <button type="button" className="btn" disabled={view.page >= view.pages} onClick={() => goTo(view.page + 1)}>
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
    <article className="min-w-0 px-3 py-3" data-speaker-id={speaker.id}>
      <div className="flex items-start gap-3">
        <PersonPhoto src={speaker.photoUrl} name={speaker.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="break-words text-body font-medium">
                <Link href={personHref(speaker.id)} className="hover:text-accent hover:underline">
                  {speaker.name}
                </Link>
              </h2>
              <p className="break-words text-meta text-mute">{speaker.titleLine || "Title and company not listed"}</p>
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
          <ul className="mt-1 space-y-1">
            {sessions.length === 0 ? (
              <li className="text-meta text-faint">No session is listed in the catalog.</li>
            ) : (
              sessions.map((session, index) => (
                <li key={`${speaker.id}-${session.dayKey}-${index}`} className="min-w-0">
                  <p className="break-words text-meta text-ink">{session.title || "Session title not listed"}</p>
                  <p className="break-words text-meta text-faint">
                    {formatSessionLine(session)}
                    {session.type ? `, ${session.type}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
          {topics.length > 0 && <p className="mt-1 break-words text-meta text-faint">{topics.join(", ")}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href={agentHref(speaker.id)} className="btn">
              Ask agent
            </Link>
            <Link href={personHref(speaker.id)} className="btn">
              Person page
            </Link>
            <Link href={reportHref(speaker.id)} className="btn btn-primary">
              Get full report
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
