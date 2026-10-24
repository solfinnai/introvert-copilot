"use client";

import Link from "next/link";
import { useSession, type SavedPerson } from "./session";

export function PersonActions({ person }: { person: SavedPerson }) {
  const { ready, isSaved, toggleSaved } = useSession();
  const saved = ready && isSaved(person.id);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!ready}
        aria-pressed={saved}
        onClick={() => toggleSaved(person)}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${
          saved ? "bg-accent text-white" : "border border-line bg-white text-ink"
        } disabled:opacity-60`}
      >
        {saved ? "Saved" : "Save"}
      </button>
      <Link href={`/chat?person=${person.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
        Ask the agent
      </Link>
    </div>
  );
}
