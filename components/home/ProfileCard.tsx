"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { PersonPhoto } from "@/components/PersonPhoto";
import { STORY_CHAT_HREF, STORY_CHAT_LABEL } from "@/lib/agent-starters";
import { homeReportMarkdown } from "@/lib/home-report";
import { HOME_NOTES_KEY, cleanHomeNotes } from "@/lib/home-storage";
import type { StoryReport } from "@/lib/story-context";

export function ProfileCard({
  name,
  headline,
  photo,
  photoFallbacks,
  report,
}: {
  name: string;
  headline: string;
  photo: string;
  photoFallbacks: string[];
  report: StoryReport;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const reportId = useId();
  const notesId = useId();
  const chips = report.chips.slice(0, 4);

  useEffect(() => {
    try {
      setNotes(cleanHomeNotes(window.localStorage.getItem(HOME_NOTES_KEY) ?? ""));
    } catch {
      setNotes("");
    }
  }, []);

  function saveNotes(value: string) {
    const next = cleanHomeNotes(value);
    setNotes(next);
    try {
      window.localStorage.setItem(HOME_NOTES_KEY, next);
    } catch {
      // The note still shows in this tab.
    }
  }

  function download() {
    const markdown = homeReportMarkdown(report, notes);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "your-report.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="panel p-3">
      <div className="flex items-start gap-3">
        <PersonPhoto src={photo} fallbacks={photoFallbacks} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-meta text-faint">Demo user</p>
          <h1 className="type-display mt-0.5 break-words text-[18px] leading-6">{name}</h1>
          {headline ? <p className="mt-1 break-words text-body text-mute">{headline}</p> : null}
          {chips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <li key={chip} className="rounded-control border border-line bg-fill px-2 py-0.5 text-meta text-mute">
                  {chip}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button
        type="button"
        className="btn mt-3"
        aria-expanded={open}
        aria-controls={reportId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide your report" : "Show your report"}
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className={`min-h-0 overflow-hidden ${open ? "" : "invisible"}`} inert={!open}>
          <div id={reportId} className="border-t border-line pt-3">
            <h2 className="type-display text-[16px] leading-6">Your report</h2>
            <p className="mt-1 text-meta text-faint">Built from your saved profile. Gaps stay gaps.</p>
            {report.sections.map((section) => (
              <section key={section.heading} className="mt-4">
                <h3 className="text-body font-medium">{section.heading}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="measure mt-1 break-words text-body leading-5 text-mute">
                    {paragraph}
                  </p>
                ))}
                {section.items.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                {section.items.map((item, index) => (
                  <li key={`${section.heading}-${index}`} className="break-words text-body leading-5">
                        {item.label ? <span className="text-faint">{item.label}. </span> : null}
                        {item.href ? (
                          <a href={item.href} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                            {item.text}
                          </a>
                        ) : (
                          item.text
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={STORY_CHAT_HREF} className="btn btn-primary">
                {STORY_CHAT_LABEL}
              </Link>
              <button type="button" className="btn" onClick={download}>
                Download report
              </button>
            </div>
            <label className="mt-4 block text-meta text-mute" htmlFor={notesId}>
              Notes
              <textarea
                id={notesId}
                value={notes}
                rows={4}
                maxLength={2000}
                className="field mt-1 resize-y"
                onChange={(event) => saveNotes(event.target.value)}
              />
            </label>
            <p className="mt-1 text-meta text-faint">Saved in this browser with the rest of the demo. Reset clears it.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
