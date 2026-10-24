"use client";

import { useEffect, useState } from "react";
import {
  DEMO_PHOTO_SRC,
  confirmedBrief,
  demoPhotoFallbacks,
  demoProfile,
  demoUser,
  displayHonestLine,
  experienceByCompany,
  publicProfileLinks,
} from "@/lib/demo-user";
import { PersonPhoto } from "./PersonPhoto";
import { OWN_WORDS_KEY, OWN_WORDS_MAX, TALK_TOPICS_KEY, cleanOwnWords, readStoredTopics } from "@/lib/talk-topics";

const AUDIENCES = [
  { id: "developers", label: "Developers" },
  { id: "creators", label: "Creators" },
  { id: "investors", label: "Investors" },
] as const;

export function YourStory() {
  const me = demoUser();
  const edu = demoProfile.education[0];
  const force = experienceByCompany("0N1 Force");
  const [topics, setTopics] = useState<string[]>(me.chips);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    try {
      setTopics(readStoredTopics(window.localStorage.getItem(TALK_TOPICS_KEY)));
      setNote(cleanOwnWords(window.localStorage.getItem(OWN_WORDS_KEY) ?? ""));
    } catch {
      setTopics(readStoredTopics(null));
    }
  }, []);

  function toggle(chip: string) {
    setTopics((current) => {
      const next = current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip];
      const ordered = me.chips.filter((item) => next.includes(item));
      try {
        window.localStorage.setItem(TALK_TOPICS_KEY, JSON.stringify(ordered));
      } catch {
        // The choice still shows in this tab.
      }
      return ordered;
    });
  }

  function saveNote(value: string) {
    const next = value.replace(/[\r\n]+/g, " ").replace(/\u2014/g, ", ").replace(/\u2013/g, ", ").slice(0, OWN_WORDS_MAX);
    setNote(next);
    try {
      window.localStorage.setItem(OWN_WORDS_KEY, next);
    } catch {
      // The note still shows in this tab.
    }
  }

  async function copyLine(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? "" : current)), 1600);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PersonPhoto src={DEMO_PHOTO_SRC} fallbacks={demoPhotoFallbacks()} name={me.name} size={88} />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Your story</p>
          <h1 className="break-words font-serif text-4xl tracking-tight">{me.name}</h1>
          <p className="mt-1 text-sm text-mute">{me.city}</p>
          <p className="mt-3 text-lg leading-8">{displayHonestLine()}</p>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">How to explain what you do</h2>
        <p className="mt-2 text-sm leading-6 text-mute">
          {me.openers[1] ?? "Pick one thread that fits the person in front of you."}
        </p>
        <ul className="mt-4 space-y-3">
          {AUDIENCES.map((audience) => (
            <li key={audience.id} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{audience.label}</p>
                  <p className="mt-2 break-words text-[15px] leading-7">{me.oneLiners[audience.id]}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 self-start rounded-full border border-line bg-white px-3 py-1.5 text-sm"
                  onClick={() => void copyLine(audience.id, me.oneLiners[audience.id])}
                >
                  {copied === audience.id ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">Topics you are happy to talk about</h2>
        <p className="mt-2 text-sm leading-6 text-mute">
          Tap a topic to keep it in. The coach and the match reasons use only the ones you leave on.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {me.chips.map((chip) => {
            const on = topics.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={on}
                className={`max-w-full break-words rounded-full border px-3 py-1.5 text-left text-sm ${
                  on ? "border-ink bg-ink text-white" : "border-line bg-white text-[#3f3a34]"
                }`}
                onClick={() => toggle(chip)}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">Proof points</h2>
        <ul className="mt-4 space-y-3">
          {me.proof.map((point) => (
            <li key={point} className="break-words border-l-2 border-accent pl-3 text-[15px] leading-7">
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 text-sm leading-6 text-[#4a453e]">
          {edu && (
            <p className="break-words">
              {edu.field} at {edu.school}, {edu.start} to {edu.end}. Degree{" "}
              {edu.degree ? (
                edu.degree
              ) : (
                <span className="inline-block rounded-md border border-dashed border-[#c4a574] px-1.5 align-middle text-[10px] uppercase tracking-wide text-[#8a5a12]">
                  GAP
                </span>
              )}
            </p>
          )}
          {force?.display && <p>0N1 Force: {force.display}.</p>}
          {confirmedBrief()
            .filter((line) => !line.startsWith("0N1 Force:") && !line.startsWith("Cinema") && !line.includes("Degree:"))
            .map((line) => (
              <p key={line} className="break-words">
                {line}
              </p>
            ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">In your own words</h2>
        <p className="mt-2 text-sm leading-6 text-mute">
          A sentence you would actually say. Leave it blank if the lines above are enough. The coach can use it, and it stays in this browser.
        </p>
        <textarea
          value={note}
          maxLength={OWN_WORDS_MAX}
          rows={4}
          placeholder="One sentence, in your words."
          className="mt-3 w-full min-w-0 resize-y rounded-2xl border border-line bg-white px-3 py-2 text-sm leading-6"
          onChange={(event) => saveNote(event.target.value)}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">Your public links</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {publicProfileLinks().map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-[#b33b12] underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
