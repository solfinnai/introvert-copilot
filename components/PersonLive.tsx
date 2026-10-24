"use client";

import { useEffect, useState } from "react";
import { PersonActions } from "./PersonActions";
import { PersonDossier } from "./PersonDossier";
import { PersonPhoto } from "./PersonPhoto";
import { ReportLinks } from "./ReportLinks";
import { SocialIcons } from "./SocialIcons";
import { LIVE_LABELS, type LivePending } from "@/lib/live-labels";
import type { LiveUpdate } from "@/lib/live-update";
import type { PersonBrief } from "@/lib/person-brief";
import type { GraphBackend, RankedPerson } from "@/lib/types";
import type { SavedDraft } from "./session";

export interface PersonSessionLine {
  title: string;
  line: string;
}

const SAFETY_MS = 22_000;

export function PersonLive({
  card,
  seed,
  sessions,
  fetchedLabel,
  cypher,
  backend,
  ms,
  report,
}: {
  card: RankedPerson;
  seed: PersonBrief;
  sessions: PersonSessionLine[];
  fetchedLabel: string;
  cypher: string;
  backend: GraphBackend;
  ms: number;
  report: boolean;
}) {
  const [shown, setShown] = useState(card);
  const [graphBackend, setGraphBackend] = useState(backend);
  const [graphMs, setGraphMs] = useState(ms);
  const [intel, setIntel] = useState(seed.intel);
  const [plan, setPlan] = useState(seed.plan);
  const [fetchReport, setFetchReport] = useState(seed.report);
  const [links, setLinks] = useState(seed.links);
  const [profiles, setProfiles] = useState(seed.profiles);
  const [pending, setPending] = useState<LivePending | null>({ ...LIVE_LABELS });

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const response = await fetch(`/api/people/${encodeURIComponent(card.id)}/path`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { card?: RankedPerson; backend?: GraphBackend; ms?: number };
        if (!body.card || body.card.id !== card.id) return;
        setShown(body.card);
        if (body.backend) setGraphBackend(body.backend);
        if (typeof body.ms === "number") setGraphMs(body.ms);
      } catch {
        /* The memory path stays on the page. */
      }
    };
    void run();
    return () => controller.abort();
  }, [card.id]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) setPending(null);
    }, SAFETY_MS);

    const applyBrief = (brief: PersonBrief) => {
      setIntel(brief.intel);
      setPlan(brief.plan);
      setFetchReport(brief.report);
      setLinks(brief.links);
      setProfiles(brief.profiles);
      setPending(null);
    };

    const applyUpdate = (update: LiveUpdate) => {
      if (update.section === "done") {
        if (update.brief) applyBrief(update.brief);
        else setPending(null);
        return;
      }
      if (update.intel) setIntel(update.intel);
      if (update.plan) setPlan(update.plan);
      if (update.report) setFetchReport(update.report);
      if (update.links) setLinks(update.links);
      if (update.profiles) setProfiles(update.profiles);
      setPending((current) => {
        if (!current) return current;
        const next: LivePending = { ...current };
        if (update.section === "news") delete next.news;
        if (update.section === "linkedin") delete next.work;
        if (update.section === "site") delete next.standout;
        if (update.section === "links") delete next.links;
        if (update.section === "plan") delete next.plan;
        if (!next.news && !next.work && !next.standout && !next.links && !next.plan) return null;
        return next;
      });
    };

    const run = async () => {
      try {
        const response = await fetch(`/api/people/${encodeURIComponent(card.id)}/live`, {
          signal: controller.signal,
          headers: { accept: "application/x-ndjson" },
        });
        if (cancelled) return;
        if (!response.ok || !response.body) {
          setPending(null);
          return;
        }
        const type = response.headers.get("content-type") || "";
        if (type.includes("application/json")) {
          const body = (await response.json()) as { brief?: PersonBrief };
          if (!cancelled && body.brief) applyBrief(body.brief);
          else if (!cancelled) setPending(null);
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const chunk = await reader.read();
          buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              applyUpdate(JSON.parse(trimmed) as LiveUpdate);
            } catch {
              /* Ignore a partial line. */
            }
          }
          if (chunk.done) break;
        }
        const tail = buffer.trim();
        if (tail) {
          try {
            applyUpdate(JSON.parse(tail) as LiveUpdate);
          } catch {
            /* The stream ended on an incomplete line. */
          }
        }
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        if (!cancelled && !aborted) setPending(null);
      } finally {
        clearTimeout(safety);
      }
    };

    void run();
    return () => {
      cancelled = true;
      clearTimeout(safety);
      controller.abort();
    };
  }, [card.id]);

  return (
    <>
      <header className="mt-3">
        <div className="flex items-start gap-3">
          <PersonPhoto src={shown.photoUrl} name={shown.name} size={40} />
          <div className="min-w-0">
            <h1 className="type-display break-words text-[22px] leading-7">{shown.name}</h1>
            <p className="text-body text-mute">{shown.titleLine}</p>
            <p className="mt-1 text-meta text-faint">Catch them: {shown.catchLine}</p>
          </div>
        </div>
        <div className="mt-4">
          <SocialIcons profiles={profiles} mode={intel.mode} />
        </div>
      </header>
      <div className="no-print mt-3">
        <PersonActions person={toSaved(shown)} />
        <ReportLinks id={card.id} report={report} />
      </div>
      <section className="panel mt-3 p-3" data-sessions={sessions.length}>
        <h2 className="type-display text-[18px] leading-6">Sessions</h2>
        {sessions.length ? (
          <ul className="mt-2 divide-y divide-line border-t border-line">
            {sessions.map((session) => (
              <li key={`${session.title}-${session.line}`} className="py-2">
                <p className="text-body font-medium">{session.title}</p>
                <p className="text-meta text-faint">{session.line}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="measure mt-2 text-body leading-5 text-mute">No public sessions in the cached snapshot.</p>
        )}
      </section>
      <div id="report" data-seed="true">
        <PersonDossier
          card={shown}
          intel={intel}
          plan={plan}
          report={fetchReport}
          links={links}
          backend={graphBackend}
          ms={graphMs}
          cypher={cypher}
          fetchedLabel={fetchedLabel}
          pending={pending}
        />
      </div>
    </>
  );
}

function toSaved(person: RankedPerson): SavedDraft {
  return {
    id: person.id,
    name: person.name,
    titleLine: person.titleLine,
    photoUrl: person.photoUrl,
    opener: person.opener,
    catchLine: person.catchLine,
  };
}
