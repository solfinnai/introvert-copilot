"use client";

import { useState } from "react";
import {
  discoveryLabel,
  explainMatch,
  visibleIntroPath,
  visiblePath,
} from "@/lib/path-explain";
import type { GraphBackend, PathChip } from "@/lib/types";

export function backendLabel(backend: GraphBackend): string {
  return backend === "falkordb" ? "FalkorDB" : "In-memory graph";
}

export function GraphPath({
  name,
  sessionTitle,
  sessionType,
  path,
  introPath,
  introName,
  hops,
  ms,
  backend,
  cypher,
  keywordHits,
  fetchedLabel,
}: {
  name: string;
  sessionTitle: string | null;
  sessionType: string | null;
  path: PathChip[];
  introPath: PathChip[];
  introName: string | null;
  hops: number;
  ms: number;
  backend: GraphBackend;
  cypher: string;
  keywordHits: string[];
  fetchedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const labels = discoveryLabel(backend);
  const summary = explainMatch({ name, sessionTitle, sessionType, path, introName, keywordHits });
  const shownPath = visiblePath(path, sessionTitle);
  const shownIntro = visibleIntroPath(introPath, sessionType);
  const hopWord = hops === 1 ? "hop" : "hops";

  return (
    <section aria-label="How we found this match" className="panel mt-3 min-w-0 max-w-full px-3 py-3">
      <p className="measure max-w-full break-words text-body leading-5 text-ink">{summary}</p>
      <div className="mt-2 flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
        {shownPath.map((chip, index) => (
          <Chip key={`${chip.kind}-${chip.text}-${index}`} chip={chip} />
        ))}
      </div>
      {introName && shownIntro.length > 0 && (
        <div className="mt-2 flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-2">
          {shownIntro.map((chip, index) => (
            <Chip key={`intro-${chip.text}-${index}`} chip={chip} />
          ))}
        </div>
      )}
      <p className="mt-2 text-meta text-mute">{labels.found}</p>
      <details className="group mt-2 min-w-0 max-w-full border-t border-line pt-2">
        <summary className="flex w-full min-w-0 cursor-pointer list-none items-start gap-2 rounded-control text-left text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="mt-0.5 w-3 shrink-0 font-mono text-meta text-faint group-open:hidden">
            +
          </span>
          <span aria-hidden="true" className="mt-0.5 hidden w-3 shrink-0 font-mono text-meta text-faint group-open:inline">
            -
          </span>
          <span className="min-w-0 flex-1 break-words">{labels.toggle}</span>
        </summary>
        <div className="mt-2 min-w-0 max-w-full space-y-2">
          <p className="break-words font-mono text-meta leading-4 text-mute">{chain(path)}</p>
          {introPath.length > 0 && (
            <p className="break-words font-mono text-meta leading-4 text-mute">Intro: {chain(introPath)}</p>
          )}
          <p className="break-words font-mono text-meta leading-4 text-faint">
            {backendLabel(backend)}, {hops} {hopWord}, {ms} ms
            {keywordHits.length > 0 ? `. Bio hits: ${keywordHits.join(", ")}` : ""}
          </p>
          <p className="measure break-words text-meta leading-4 text-faint">
            Source: GitHub Universe speaker catalog, fetched {fetchedLabel}. Whole-word matches use the public bio and job title.
          </p>
          <pre className="max-w-full whitespace-pre-wrap break-words font-mono text-meta leading-4 text-mute">{cypher}</pre>
          <button
            type="button"
            className="text-meta font-medium text-accent hover:underline"
            onClick={() => {
              void navigator.clipboard.writeText(cypher).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "Copied" : "Copy query"}
          </button>
        </div>
      </details>
    </section>
  );
}

function chain(chips: PathChip[]): string {
  return chips.map((chip) => chip.text).join(" / ");
}

function Chip({ chip }: { chip: PathChip }) {
  if (chip.kind === "edge") {
    return <span className="max-w-full text-meta leading-4 text-faint">{chip.text}</span>;
  }
  const solid = chip.kind === "node" && chip.tone === "solid";
  return (
    <span className={solid ? "max-w-full break-words text-meta font-medium leading-4 text-ink" : "max-w-full break-words text-meta leading-4 text-mute"}>
      {chip.text}
    </span>
  );
}
