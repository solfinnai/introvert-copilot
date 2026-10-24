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
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-sm ${
          on ? "text-accent" : "text-mute"
        }`}
        onClick={() => {
          if (!on && state.saved.length >= SAVED_CAP) {
            setFull(true);
            return;
          }
          setFull(false);
          toggleSaved(person);
        }}
      >
        <Heart filled={on} />
        <span className="hidden sm:inline">{on ? "Saved" : "Save"}</span>
      </button>
      {full && <span className="max-w-[11rem] text-right text-[11px] leading-4 text-mute">List is full. Remove someone first.</span>}
    </span>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9.1C5 8 6.8 6.2 9.1 6.2c1.3 0 2.4.6 2.9 1.6.5-1 1.6-1.6 2.9-1.6C17.2 6.2 19 8 19 10.9 19 15.6 12 20 12 20z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
