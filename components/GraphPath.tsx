"use client";

import { useState } from "react";
import type { GraphBackend, PathChip } from "@/lib/types";

export function backendLabel(backend: GraphBackend): string {
  return backend === "falkordb" ? "FalkorDB" : "In-memory graph";
}

export function GraphPath({
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
  return (
    <div className="mt-4 rounded-2xl border border-line bg-[#faf7f2] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {path.map((chip, index) => (
          <Chip key={`${chip.kind}-${chip.text}-${index}`} chip={chip} />
        ))}
      </div>
      {introName && introPath.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-[#ddd4c6] pt-3">
          <span className="text-xs uppercase tracking-[0.14em] text-mute">intro via</span>
          {introPath.map((chip, index) => (
            <Chip key={`intro-${chip.text}-${index}`} chip={chip} />
          ))}
        </div>
      )}
      <p className="mt-3 font-mono text-[11px] leading-5 text-mute">
        {backendLabel(backend)}, {hops} hops, {ms} ms
        {keywordHits.length > 0 ? `. Bio hits: ${keywordHits.join(", ")}` : ""}
      </p>
      <p className="mt-1 text-xs text-mute">
        Source: GitHub Universe speaker catalog, fetched {fetchedLabel}. Whole-word matches use the public bio and job title.
      </p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#3f3a34]">
        {cypher}
      </pre>
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-[#b33b12] underline-offset-2 hover:underline"
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
  );
}

function Chip({ chip }: { chip: PathChip }) {
  if (chip.kind === "edge") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{chip.text}</span>
    );
  }
  return (
    <span
      className={
        chip.tone === "solid"
          ? "rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white"
          : "rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink"
      }
    >
      {chip.text}
    </span>
  );
}
