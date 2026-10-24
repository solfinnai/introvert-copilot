"use client";

import { useEffect, useState } from "react";
import { SPONSORS, graphSizeFromHealth } from "@/lib/home";

const CACHE_MS = 60_000;

let memory: { at: number; label: string } | null = null;

function cachedLabel(): string | null {
  if (typeof window === "undefined" || !memory) return null;
  if (Date.now() - memory.at > CACHE_MS) return null;
  return memory.label;
}

export function PoweredBy() {
  const [size, setSize] = useState<string | null>(cachedLabel);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const warm = cachedLabel();
    if (warm) {
      setSize(warm);
      setFailed(false);
      return;
    }
    const ctrl = new AbortController();
    fetch("/api/health", { cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("health");
        const label = graphSizeFromHealth(await res.json());
        if (!label) throw new Error("health");
        memory = { at: Date.now(), label };
        setSize(label);
        setFailed(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setFailed(true);
      });
    return () => ctrl.abort();
  }, []);

  const falkorDetail = size ?? (failed ? "size unavailable" : "checking the graph");

  return (
    <footer className="px-5 pb-6 md:px-10">
      <div className="border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Powered by</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {SPONSORS.map((sponsor) => {
            const detail = sponsor.name === "FalkorDB" ? falkorDetail : sponsor.role;
            return (
              <li key={sponsor.href} className="max-w-full text-xs leading-5">
                <a
                  href={sponsor.href}
                  className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 font-medium text-ink underline decoration-[#e3dcd0] underline-offset-4 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span>{sponsor.name}</span>
                  <span className="font-normal text-mute no-underline">{detail}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
