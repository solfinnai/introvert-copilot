"use client";

import { useState } from "react";

export function ChatStub({ name }: { name: string | null }) {
  const [status, setStatus] = useState<"pending" | "approved" | "denied">("pending");
  const who = name ?? "this person";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section>
        <p className="text-xs text-mute">Opened from Who to meet</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Talking about {who}</h1>
          <span className="rounded-full border border-line bg-white px-3 py-1 text-xs">Change person on Who to meet</span>
        </div>
        <div className="mt-6 space-y-4">
          <div className="ml-auto max-w-lg rounded-2xl bg-ink px-4 py-3 text-sm text-white">
            Help me introduce myself to {who} in 30 seconds. I freeze up after talks.
          </div>
          <div className="max-w-2xl rounded-2xl border border-line bg-white p-4 text-sm leading-6">
            <p>Keep it to two sentences and hand the floor back fast.</p>
            <p className="mt-3 border-l-2 border-accent pl-3">
              I direct films and build stories with AI. Your session is why I came over. How are you
              thinking about this for people who are not engineers?
            </p>
            <p className="mt-3 text-mute">
              The live agent, with tool calls and a real opener for {who}, lands in the next pass.
              Sending stays off.
            </p>
          </div>
          <article className="max-w-2xl rounded-2xl border border-line bg-white p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              Approval required. TrueForge, send_followup
            </p>
            <p className="mt-3 text-sm leading-6">
              Hi {name ? name.split(" ")[0] : "there"}. I liked our conversation. Here is the short
              clip I mentioned. Henry
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1.5 text-sm"
                onClick={() => setStatus("denied")}
              >
                Deny
              </button>
              <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" disabled>
                Edit
              </button>
              <button
                type="button"
                className="rounded-full bg-ink px-3 py-1.5 text-sm text-white"
                onClick={() => setStatus("approved")}
              >
                Allow
              </button>
              <p className="text-xs text-mute">
                {status === "approved"
                  ? "Approved, not sent. Nothing left this demo."
                  : status === "denied"
                    ? "Denied. Nothing was sent."
                    : "Demo: Allow does not send anything."}
              </p>
            </div>
          </article>
        </div>
        <form
          className="mt-8 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <input
            disabled
            placeholder={name ? `Ask anything about ${name.split(" ")[0]}...` : "Ask anything..."}
            className="w-full rounded-full border border-line bg-white px-4 py-3 text-sm text-mute"
          />
          <button type="submit" disabled className="rounded-full bg-ink px-4 py-3 text-sm text-white opacity-40">
            Send
          </button>
        </form>
        <p className="mt-2 text-xs text-mute">Sending is off in this demo.</p>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">What the agent knows</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#3f3a34]">
            <li>Henry&apos;s public profile and the speaker catalog</li>
            <li>The graph path for {who}</li>
            <li>Nothing is sent without an approval that still cannot send</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-mute">
          On stage, TrueForge shows this approval card. The public app will call OpenAI directly.
          This screen is a stub.
        </div>
      </aside>
    </div>
  );
}
