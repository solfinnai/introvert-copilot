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
    <footer className="px-4 pb-5 md:px-6">
      <div className="border-t border-line pt-3">
        <p className="text-meta text-faint">CUE. Your conference co-pilot.</p>
        <p className="mt-2 text-meta text-faint">Powered by</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {SPONSORS.map((sponsor) => {
            const detail = sponsor.name === "FalkorDB" ? falkorDetail : sponsor.role;
            return (
              <li key={sponsor.href} className="max-w-full text-meta leading-4">
                <a href={sponsor.href} className="text-accent hover:underline">
                  {sponsor.name}
                </a>
                <span className="text-faint"> {detail}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
