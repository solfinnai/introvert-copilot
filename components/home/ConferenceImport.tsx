"use client";

import { useEffect, useState } from "react";
import { HomeMatches } from "@/components/home/HomeMatches";
import {
  IMPORT_LABEL,
  IMPORT_MS,
  importStageAt,
  type ConferenceFacts,
} from "@/lib/home-conference";
import { HOME_IMPORT_KEY } from "@/lib/home-storage";
import { shownCount, type HomeMatch } from "@/lib/home-matches";

type Phase = "idle" | "running" | "done";

export function ConferenceImport({
  conference,
  people,
  speakerCount,
}: {
  conference: ConferenceFacts;
  people: HomeMatch[];
  speakerCount: number;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const shown = shownCount(people);
  const stage = importStageAt(progress, {
    speakers: conference.speakers,
    sessions: conference.sessions,
    topics: conference.topics,
    shown,
  });

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(HOME_IMPORT_KEY) === "1") {
        setProgress(1);
        setPhase("done");
      }
    } catch {
      // Stay on the import button.
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(1, (performance.now() - started) / IMPORT_MS);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(timer);
        finish();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [phase]);

  function finish() {
    try {
      window.sessionStorage.setItem(HOME_IMPORT_KEY, "1");
    } catch {
      // The list still shows in this tab.
    }
    setProgress(1);
    setPhase("done");
  }

  function start() {
    setProgress(0);
    setPhase("running");
  }

  function runAgain() {
    try {
      window.sessionStorage.removeItem(HOME_IMPORT_KEY);
    } catch {
      // The next finish will try to store it again.
    }
    start();
  }

  return (
    <section className="mt-4" aria-labelledby="universe-heading">
      <div className="panel px-4 py-6 text-center">
        <p className="text-meta text-faint">Your conference co-pilot</p>
        <h2 id="universe-heading" className="type-display mt-2 text-[26px] leading-8 sm:text-[32px] sm:leading-9">
          {conference.name}
        </h2>
        <p className="mt-2 text-body text-mute">{conference.dates}</p>
        <p className="text-body text-mute">{conference.venue}</p>
        <dl className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-2 text-left sm:grid-cols-4">
          <Count label="Speakers" value={conference.speakers} />
          <Count label="Sessions" value={conference.sessions} />
          <Count label="Topics" value={conference.topics} />
          <Count label="Companies" value={conference.companies} />
        </dl>
        <p className="mx-auto mt-3 max-w-xl text-meta leading-4 text-faint">{conference.scrapeNote}</p>
        {phase === "idle" && (
          <div className="mt-5 flex justify-center">
            <button type="button" className="btn btn-primary h-auto min-h-12 w-full max-w-xl whitespace-normal px-4 py-3 text-[15px] leading-5" onClick={start}>
              {IMPORT_LABEL}
            </button>
          </div>
        )}
        {phase === "running" && (
          <div className="mx-auto mt-5 max-w-xl text-left" aria-busy="true">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stage.percent}
              aria-valuetext={stage.label}
              className="h-1 overflow-hidden rounded-full bg-fill"
            >
              <div className="h-full bg-accent motion-reduce:transition-none" style={{ width: `${stage.percent}%` }} />
            </div>
            <p className="mt-2 text-body text-ink" aria-live="polite">
              {stage.label}
            </p>
            <p className="text-meta text-faint">
              {stage.current} of {stage.total}
            </p>
          </div>
        )}
        <p className="mx-auto mt-3 max-w-xl text-meta leading-4 text-faint">{conference.matchNote}</p>
      </div>
      {phase === "done" && (
        <div className="motion-safe:animate-[home-in_320ms_ease-out]">
          <HomeMatches people={people} speakerCount={speakerCount} onRunAgain={runAgain} />
        </div>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-line px-2 py-2">
      <dt className="text-meta text-faint">{label}</dt>
      <dd className="type-display text-[18px] leading-6">{value}</dd>
    </div>
  );
}
