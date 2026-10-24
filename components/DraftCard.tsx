"use client";

import { useState } from "react";
import { deliverShare, emailText, mailtoHref, type FollowupDraft, type ShareResult } from "@/lib/draft";

const buttonClass =
  "inline-flex w-full items-center justify-center rounded-full border px-3 py-2 text-center text-sm sm:w-auto";
const quietClass = `${buttonClass} border-line bg-white text-ink`;
const solidClass = `${buttonClass} border-ink bg-ink text-white`;

export function DraftCard({ draft }: { draft: FollowupDraft }) {
  const [status, setStatus] = useState("");

  async function copyText(text: string, done: string) {
    const ok = await writeClipboard(text);
    setStatus(ok ? done : "Select the draft and copy it yourself.");
  }

  async function sendAnywhere() {
    const result = await deliverShare(draft, {
      share:
        typeof navigator !== "undefined" && typeof navigator.share === "function"
          ? (data) => navigator.share(data)
          : undefined,
      canShare:
        typeof navigator !== "undefined" && typeof navigator.canShare === "function"
          ? (data) => navigator.canShare(data)
          : undefined,
      copy: writeClipboard,
    });
    setStatus(shareStatus(result));
  }

  return (
    <article className="mt-3 max-w-full rounded-2xl border border-line bg-[#fff7f3] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b33b12]">
        You review and send it yourself
      </p>
      <p className="mt-2 break-words text-sm font-semibold">{draft.subject}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{draft.body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a href={mailtoHref(draft)} className={solidClass}>
          Open in my email
        </a>
        <button type="button" className={quietClass} onClick={() => void copyText(emailText(draft), "Copied.")}>
          Copy
        </button>
        <button
          type="button"
          className={quietClass}
          onClick={() => void copyText(draft.linkedinNote, "LinkedIn note copied.")}
        >
          Copy for LinkedIn
        </button>
        {draft.linkedinUrl && (
          <a href={draft.linkedinUrl} target="_blank" rel="noreferrer noopener" className={quietClass}>
            Open LinkedIn profile
          </a>
        )}
        <button type="button" className={quietClass} onClick={() => void sendAnywhere()}>
          Send anywhere
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-mute">{status}</p>}
    </article>
  );
}

function shareStatus(result: ShareResult): string {
  if (result === "shared") return "Your share sheet is open. You still send it yourself.";
  if (result === "copied") return "Copied. Paste it into the app you want.";
  if (result === "cancelled") return "";
  return "Select the draft and copy it yourself.";
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older copy path.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
