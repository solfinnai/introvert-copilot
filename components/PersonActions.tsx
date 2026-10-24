"use client";

import Link from "next/link";
import { useState } from "react";
import { SAVED_CAP, type SavedDraft } from "@/lib/saved";
import { useSession } from "./session";

export function PersonActions({ person }: { person: SavedDraft }) {
  const { state, ready, isSaved, toggleSaved } = useSession();
  const [full, setFull] = useState(false);
  const saved = ready && isSaved(person.id);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!ready}
        aria-pressed={saved}
        onClick={() => {
          if (!ready) return;
          if (!saved && state.saved.length >= SAVED_CAP) {
            setFull(true);
            return;
          }
          setFull(false);
          toggleSaved(person);
        }}
        className={`btn ${saved ? "btn-selected" : "btn-quiet"}`}
      >
        {saved ? "Saved" : "Save"}
      </button>
      {full && <span className="text-meta text-faint">List is full. Remove someone first.</span>}
      <Link href={`/agent?person=${person.id}`} className="btn btn-primary">
        Ask the agent
      </Link>
    </div>
  );
}
