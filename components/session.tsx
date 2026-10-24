"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  SAVED_STORAGE_KEY,
  emptyDemoState,
  parseDemoState,
  toggleSaved as toggleSavedState,
  updateSaved as updateSavedState,
  type DemoState,
  type SavedDraft,
  type SavedPerson,
} from "@/lib/saved";

export type { SavedPerson, SavedDraft };

interface SessionApi {
  state: DemoState;
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggleSaved: (person: SavedDraft) => void;
  updateSaved: (id: string, patch: { note?: string; nextStep?: string }) => void;
  markMet: (id: string) => void;
  resetLocal: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyDemoState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setState(parseDemoState(window.localStorage.getItem(SAVED_STORAGE_KEY)));
    } catch {
      setState(emptyDemoState);
    }
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
    try {
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing can block storage. The list still works in this tab.
    }
  }, [state, ready]);

  const api: SessionApi = {
    state,
    ready,
    isSaved: (id) => state.saved.some((person) => person.id === id),
    toggleSaved: (person) => setState((current) => toggleSavedState(current, person)),
    updateSaved: (id, patch) => setState((current) => updateSavedState(current, id, patch)),
    markMet: (id) => {
      setState((current) => ({
        ...current,
        met: current.met.includes(id) ? current.met : [...current.met, id].slice(0, 40),
      }));
    },
    resetLocal: () => {
      setState(emptyDemoState);
      try {
        window.localStorage.removeItem(SAVED_STORAGE_KEY);
      } catch {
        // The in-memory list is already empty.
      }
    },
  };

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}
