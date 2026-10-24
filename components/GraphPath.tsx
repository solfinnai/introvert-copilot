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
  const summary = explainMatch({ name, sessionTitle, path, introName, keywordHits });
  const shownPath = visiblePath(path, sessionTitle);
  const shownIntro = visibleIntroPath(introPath);
  const hopWord = hops === 1 ? "hop" : "hops";

  return (
    <section
      aria-label="How we found this match"
      className="mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-line bg-[#faf7f2] px-4 py-3"
    >
      <p className="max-w-full break-words text-[15px] leading-7 text-[#2c2824]">{summary}</p>
      <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1.5">
        {shownPath.map((chip, index) => (
          <Chip key={`${chip.kind}-${chip.text}-${index}`} chip={chip} />
        ))}
      </div>
      {introName && shownIntro.length > 0 && (
        <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-dashed border-[#ddd4c6] pt-3">
          {shownIntro.map((chip, index) => (
            <Chip key={`intro-${chip.text}-${index}`} chip={chip} />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-mute">{labels.found}</p>
      <details className="group mt-3 min-w-0 max-w-full border-t border-dashed border-[#ddd4c6] pt-3">
        <summary className="flex w-full min-w-0 cursor-pointer list-none items-start gap-2 rounded-md text-left text-sm font-semibold text-[#3f3a34] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="mt-0.5 w-3 shrink-0 font-mono text-mute group-open:hidden">
            +
          </span>
          <span
            aria-hidden="true"
            className="mt-0.5 hidden w-3 shrink-0 font-mono text-mute group-open:inline"
          >
            -
          </span>
          <span className="min-w-0 flex-1 break-words">{labels.toggle}</span>
        </summary>
        <div className="mt-3 min-w-0 max-w-full space-y-2">
          <p className="break-words font-mono text-[11px] leading-5 text-[#3f3a34]">{chain(path)}</p>
          {introPath.length > 0 && (
            <p className="break-words font-mono text-[11px] leading-5 text-[#3f3a34]">
              Intro: {chain(introPath)}
            </p>
          )}
          <p className="break-words font-mono text-[11px] leading-5 text-mute">
            {backendLabel(backend)}, {hops} {hopWord}, {ms} ms
            {keywordHits.length > 0 ? `. Bio hits: ${keywordHits.join(", ")}` : ""}
          </p>
          <p className="break-words text-xs leading-5 text-mute">
            Source: GitHub Universe speaker catalog, fetched {fetchedLabel}. Whole-word matches use the
            public bio and job title.
          </p>
          <pre className="max-w-full whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#3f3a34]">
            {cypher}
          </pre>
          <button
            type="button"
            className="text-xs font-semibold text-[#b33b12] underline-offset-2 hover:underline"
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
  return chips.map((chip) => chip.text).join(" · ");
}

function Chip({ chip }: { chip: PathChip }) {
  if (chip.kind === "edge") {
    return <span className="max-w-full text-xs leading-5 text-mute">{chip.text}</span>;
  }
  const solid = chip.kind === "node" && chip.tone === "solid";
  return (
    <span
      className={
        solid
          ? "max-w-full break-words rounded-2xl bg-ink px-2.5 py-1 text-left text-xs font-medium leading-5 text-white"
          : "max-w-full break-words rounded-2xl border border-line bg-white px-2.5 py-1 text-left text-xs leading-5 text-ink"
      }
    >
      {chip.text}
    </span>
  );
}
