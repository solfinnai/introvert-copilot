"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  MET_CONFIRMATION,
  SAVED_STORAGE_KEY,
  emptyDemoState,
  parseDemoState,
  toggleSaved as toggleSavedState,
  updateSaved as updateSavedState,
  type DemoState,
  type SavedDraft,
  type SavedPerson,
} from "@/lib/saved";
import { HOME_IMPORT_KEY, HOME_NOTES_KEY } from "@/lib/home-storage";
import { OWN_WORDS_KEY, TALK_TOPICS_KEY } from "@/lib/talk-topics";

export type { SavedPerson, SavedDraft };

export interface MetToast {
  id: string;
  message: string;
}

interface SessionApi {
  state: DemoState;
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggleSaved: (person: SavedDraft) => void;
  updateSaved: (id: string, patch: { note?: string; nextStep?: string }) => void;
  markMet: (id: string) => void;
  toast: MetToast | null;
  undoToast: () => void;
  resetLocal: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyDemoState);
  const [ready, setReady] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<MetToast | null>(null);
  const toastId = useRef<string | null>(null);
  toastId.current = toast?.id ?? null;

  useEffect(() => {
    try {
      setState(parseDemoState(window.localStorage.getItem(SAVED_STORAGE_KEY)));
    } catch {
      setState(emptyDemoState);
    }
    setHydrated(true);
    setReady(true);
    fetch("/api/session", { method: "POST" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing can block storage. The list still works in this tab.
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const api: SessionApi = {
    state,
    ready,
    toast,
    isSaved: (id) => state.saved.some((person) => person.id === id),
    toggleSaved: (person) => setState((current) => toggleSavedState(current, person)),
    updateSaved: (id, patch) => setState((current) => updateSavedState(current, id, patch)),
    markMet: (id) => {
      setState((current) => ({
        ...current,
        met: current.met.includes(id) ? current.met : [...current.met, id].slice(0, 40),
      }));
      setToast({ id, message: MET_CONFIRMATION });
    },
    undoToast: () => {
      const id = toastId.current;
      setToast(null);
      if (!id) return;
      setState((current) => ({
        ...current,
        met: current.met.filter((item) => item !== id),
      }));
    },
    resetLocal: () => {
      setToast(null);
      setState(emptyDemoState);
      try {
        window.localStorage.removeItem(SAVED_STORAGE_KEY);
        window.localStorage.removeItem(TALK_TOPICS_KEY);
        window.localStorage.removeItem(OWN_WORDS_KEY);
        window.localStorage.removeItem(HOME_NOTES_KEY);
        window.sessionStorage.removeItem(HOME_IMPORT_KEY);
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
