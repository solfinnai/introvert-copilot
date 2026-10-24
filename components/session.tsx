"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "ic-demo-v1";

export interface SavedPerson {
  id: string;
  name: string;
  titleLine: string;
  photoUrl: string;
  opener: string;
  catchLine: string;
}

interface DemoState {
  saved: SavedPerson[];
  met: string[];
}

const empty: DemoState = { saved: [], met: [] };

interface SessionApi {
  state: DemoState;
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggleSaved: (person: SavedPerson) => void;
  markMet: (id: string) => void;
  resetLocal: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readState());
    let cancelled = false;
    fetch("/api/session", { method: "POST" })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const api: SessionApi = {
    state,
    ready,
    isSaved: (id) => state.saved.some((person) => person.id === id),
    toggleSaved: (person) => {
      setState((current) => {
        const exists = current.saved.some((item) => item.id === person.id);
        const saved = exists
          ? current.saved.filter((item) => item.id !== person.id)
          : [...current.saved, person].slice(0, 24);
        return { ...current, saved };
      });
    },
    markMet: (id) => {
      setState((current) => ({
        ...current,
        met: current.met.includes(id) ? current.met : [...current.met, id].slice(0, 40),
      }));
    },
    resetLocal: () => {
      setState(empty);
      window.localStorage.removeItem(KEY);
    },
  };

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}

function readState(): DemoState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const saved = Array.isArray(parsed.saved) ? parsed.saved.filter(isSaved) : [];
    const met = Array.isArray(parsed.met) ? parsed.met.filter((id) => typeof id === "string") : [];
    return { saved, met };
  } catch {
    return empty;
  }
}

function isSaved(value: unknown): value is SavedPerson {
  if (!value || typeof value !== "object") return false;
  const person = value as SavedPerson;
  return typeof person.id === "string" && typeof person.name === "string";
}
