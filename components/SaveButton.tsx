"use client";

import { useState } from "react";
import { SAVED_CAP, type SavedDraft } from "@/lib/saved";
import { useSession } from "./session";

export function SaveButton({ person }: { person: SavedDraft }) {
  const { state, ready, isSaved, toggleSaved } = useSession();
  const [full, setFull] = useState(false);
  const on = ready && isSaved(person.id);
  return (
    <span className="inline-flex max-w-full flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `Remove ${person.name} from who I want to talk to` : `Save ${person.name}`}
        disabled={!ready}
        className={`btn ${on ? "btn-selected" : "btn-quiet"}`}
        onClick={() => {
          if (!ready) return;
          if (!on && state.saved.length >= SAVED_CAP) {
            setFull(true);
            return;
          }
          setFull(false);
          toggleSaved(person);
        }}
      >
        <Heart filled={on} />
        <span className="ml-1">{on ? "Saved" : "Save"}</span>
      </button>
      {full && <span className="max-w-[11rem] text-right text-meta text-faint">List is full. Remove someone first.</span>}
    </span>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <path
        d="M8 13.2S2.8 9.8 2.8 6.6C2.8 4.9 4.1 3.7 5.7 3.7c.9 0 1.6.4 2.3 1.3.7-.9 1.4-1.3 2.3-1.3 1.6 0 2.9 1.2 2.9 2.9C13.2 9.8 8 13.2 8 13.2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
