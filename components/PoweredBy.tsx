"use client";

import { useEffect, useState } from "react";
import { SPONSORS, graphSizeFromHealth } from "@/lib/home";

const CACHE_MS = 60_000;
const REQUEST_MS = 8_000;

let memory: { at: number; label: string } | null = null;

function cachedLabel(): string | null {
  if (!memory) return null;
  if (Date.now() - memory.at > CACHE_MS) return null;
  return memory.label;
}

export function PoweredBy() {
  const [size, setSize] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ctrl: AbortController | null = null;

    const schedule = (ms: number) => {
      if (cancelled) return;
      timer = setTimeout(() => void load(), ms);
    };

    async function load() {
      const warm = cachedLabel();
      if (warm) {
        if (!cancelled) {
          setSize(warm);
          setFailed(false);
        }
        const age = memory ? Date.now() - memory.at : CACHE_MS;
        schedule(Math.max(1_000, CACHE_MS - age));
        return;
      }

      ctrl = new AbortController();
      const deadline = setTimeout(() => ctrl?.abort(), REQUEST_MS);
      try {
        const res = await fetch("/api/health", { signal: ctrl.signal });
        if (!res.ok) throw new Error("health");
        const label = graphSizeFromHealth(await res.json());
        if (!label) throw new Error("health");
        memory = { at: Date.now(), label };
        if (!cancelled) {
          setSize(label);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        clearTimeout(deadline);
      }
      schedule(CACHE_MS);
    }

    const warm = cachedLabel();
    if (warm) {
      setSize(warm);
      setFailed(false);
    }
    void load();
    return () => {
      cancelled = true;
      ctrl?.abort();
      if (timer) clearTimeout(timer);
    };
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
