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
      <header className="flex items-start gap-3">
        <PersonPhoto src={DEMO_PHOTO_SRC} fallbacks={demoPhotoFallbacks()} name={me.name} size={40} />
        <div className="min-w-0">
          <h1 className="type-display break-words text-[22px] leading-7">{me.name}</h1>
          <p className="mt-0.5 text-meta text-mute">{me.city}</p>
          <p className="measure mt-2 text-body leading-5">{displayHonestLine()}</p>
        </div>
      </header>

      <section className="mt-6 border-t border-line pt-4">
        <h2 className="type-display text-[18px] leading-6">How to explain what you do</h2>
        <p className="measure mt-1 text-body leading-5 text-mute">
          {me.openers[1] ?? "Pick one thread that fits the person in front of you."}
        </p>
        <ul className="panel mt-3 divide-y divide-line">
          {AUDIENCES.map((audience) => (
            <li key={audience.id} className="px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-meta text-faint">{audience.label}</p>
                  <p className="measure mt-1 break-words text-body leading-5">{me.oneLiners[audience.id]}</p>
                </div>
                <button type="button" className="btn shrink-0 self-start" onClick={() => void copyLine(audience.id, me.oneLiners[audience.id])}>
                  {copied === audience.id ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 border-t border-line pt-4">
        <h2 className="type-display text-[18px] leading-6">Topics you are happy to talk about</h2>
        <p className="measure mt-1 text-body leading-5 text-mute">
          Tap a topic to keep it in. The coach and the match reasons use only the ones you leave on.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {me.chips.map((chip) => {
            const on = topics.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={on}
                className={`btn h-auto max-w-full py-1 text-left ${on ? "btn-selected" : "btn-quiet"}`}
                onClick={() => toggle(chip)}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 border-t border-line pt-4">
        <h2 className="type-display text-[18px] leading-6">Proof points</h2>
        <ul className="mt-3 space-y-2">
          {me.proof.map((point) => (
            <li key={point} className="measure break-words border-l border-accent pl-3 text-body leading-5">
              {point}
            </li>
          ))}
        </ul>
        <div className="measure mt-3 space-y-2 text-body leading-5 text-mute">
          {edu && (
            <p className="break-words">
              {edu.field} at {edu.school}, {edu.start} to {edu.end}. Degree {edu.degree ? edu.degree : <span className="text-faint">(gap)</span>}
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

      <section className="mt-6 border-t border-line pt-4">
        <h2 className="type-display text-[18px] leading-6">In your own words</h2>
        <p className="measure mt-1 text-body leading-5 text-mute">
          A sentence you would actually say. Leave it blank if the lines above are enough. The coach can use it, and it stays in this browser.
        </p>
        <label className="mt-3 block text-meta text-mute">
          Your sentence
          <textarea
            value={note}
            maxLength={OWN_WORDS_MAX}
            rows={4}
            className="field mt-1 resize-y"
            onChange={(event) => saveNote(event.target.value)}
          />
        </label>
      </section>

      <section className="mt-6 border-t border-line pt-4">
        <h2 className="type-display text-[18px] leading-6">Your public links</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {publicProfileLinks().map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-body text-accent hover:underline" target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
