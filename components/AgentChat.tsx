"use client";

import { useEffect, useRef, useState } from "react";
import { DraftCard } from "./DraftCard";
import { PersonNameLink, PersonPhotoLink } from "./person-return";
import {
  AGENT_GREETING,
  GENERAL_STARTERS,
  STORY_STARTER,
  speakerStarterChips,
  type SpeakerOption,
} from "@/lib/agent-starters";
import type { AgentReply, PersonFacts } from "@/lib/coach-types";
import type { FollowupDraft } from "@/lib/draft";
import { readStoredTopics, TALK_TOPICS_KEY } from "@/lib/talk-topics";

interface Bubble {
  role: "user" | "assistant";
  content: string;
  draft: FollowupDraft | null;
  source: string;
}

interface ActivePerson {
  id: string;
  name: string;
  titleLine: string;
  photoUrl: string;
}

const REACH = "The coach could not be reached. Try the question again.";

export function AgentChat({
  person: initial,
  autostart = null,
  speakers,
}: {
  person: PersonFacts | null;
  autostart?: string | null;
  speakers: SpeakerOption[];
}) {
  const initialPerson = initial
    ? {
        id: initial.id,
        name: initial.name,
        titleLine: initial.titleLine,
        photoUrl: initial.photoUrl,
      }
    : null;
  const [person, setPerson] = useState<ActivePerson | null>(initialPerson);
  const [messages, setMessages] = useState<Bubble[]>(() =>
    autostart ? [{ role: "user", content: autostart, draft: null, source: "" }] : [],
  );
  const [text, setText] = useState("");
  const [pending, setPending] = useState(Boolean(autostart));
  const [query, setQuery] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const personRef = useRef<ActivePerson | null>(initialPerson);
  const first = person?.name.split(" ")[0] ?? "";
  const chips = person ? speakerStarterChips(first) : [...GENERAL_STARTERS];
  const showPicker = !person && messages.some((item) => item.role === "user" && item.content === "Talk about a speaker");
  const matches = filterSpeakers(speakers, query);

  useEffect(() => {
    personRef.current = person;
  }, [person]);

  useEffect(() => {
    if (autostart !== STORY_STARTER) return;
    const timer = window.setTimeout(() => {
      void requestReply([{ role: "user", content: autostart, draft: null, source: "" }], personRef.current?.id ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
    // The story button preloads one user message. Reply once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, pending]);

  async function ask(raw: string, personId = personRef.current?.id ?? null) {
    const content = raw.trim();
    if (!content || pending) return;
    const named = personId ? null : speakers.find((item) => item.name.toLowerCase() === content.toLowerCase());
    const nextPerson = named
      ? { id: named.id, name: named.name, titleLine: named.titleLine, photoUrl: named.photoUrl }
      : personRef.current;
    if (named) {
      personRef.current = nextPerson;
      setPerson(nextPerson);
    }
    const history: Bubble[] = [...messages, { role: "user", content, draft: null, source: "" }];
    await requestReply(history, nextPerson?.id ?? null);
  }

  async function requestReply(history: Bubble[], personId: string | null) {
    const pendingIndex = history.length;
    setMessages([...history, { role: "assistant", content: "", draft: null, source: "" }]);
    setText("");
    setPending(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          messages: history.map((item) => ({ role: item.role, content: historyContent(item) })),
          topics: storedTopics(),
        }),
      });
      const reply = await readReply(res, (partial) => {
        setMessages((current) => replaceAt(current, pendingIndex, { role: "assistant", content: partial, draft: null, source: "openai" }));
      });
      setMessages((current) => replaceAt(current, pendingIndex, { role: "assistant", ...reply }));
    } catch {
      setMessages((current) =>
        replaceAt(current, pendingIndex, { role: "assistant", content: REACH, draft: null, source: "fallback" }),
      );
    } finally {
      setPending(false);
    }
  }

  function chooseSpeaker(option: SpeakerOption) {
    const next = { id: option.id, name: option.name, titleLine: option.titleLine, photoUrl: option.photoUrl };
    personRef.current = next;
    setPerson(next);
    void ask(`Tell me about ${option.name}`, option.id);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-12rem)] w-full max-w-3xl flex-col md:h-[calc(100dvh-8.5rem)]">
      {messages.length > 0 && <h1 className="sr-only">{AGENT_GREETING}</h1>}
      {person && (
        <div className="mb-3 flex items-center gap-2">
          <PersonPhotoLink id={person.id} name={person.name} src={person.photoUrl} size={28} />
          <div className="min-w-0">
            <p className="text-meta text-faint">About this speaker</p>
            <p className="truncate text-body font-medium">
              <PersonNameLink id={person.id} name={person.name} />
            </p>
            <p className="truncate text-meta text-mute">{person.titleLine}</p>
          </div>
        </div>
      )}

      <div ref={scroller} className="flex-1 overflow-y-auto" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
            <h1 className="type-display max-w-md text-[22px] leading-7">{AGENT_GREETING}</h1>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-1.5">
              {chips.map((prompt) => (
                <Chip key={prompt} label={prompt} disabled={pending} onClick={() => void ask(prompt)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`min-w-0 rounded-panel px-3 py-2 ${item.draft ? "w-full bg-surface" : "max-w-[92%] bg-surface"} ${item.role === "user" ? "bg-fill" : ""}`}>
                  <p className="text-meta text-faint">{item.role === "user" ? "You" : "Agent"}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-body leading-5">
                    {item.content || (pending && index === messages.length - 1 ? "Thinking..." : "")}
                  </p>
                  {item.draft && <DraftCard draft={item.draft} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((prompt) => (
            <Chip key={prompt} label={prompt} disabled={pending} onClick={() => void ask(prompt)} />
          ))}
        </div>
      )}

      {showPicker && (
        <div className="panel mt-3 p-3">
          <label className="block text-meta text-mute">
            Find a speaker
            <input
              value={query}
              className="field mt-1"
              placeholder="Type a name"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className="mt-2 divide-y divide-line">
            {matches.map((option) => (
              <li key={option.id} className="flex items-start gap-2 py-2">
                <PersonPhotoLink id={option.id} name={option.name} src={option.photoUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-body font-medium">
                    <PersonNameLink id={option.id} name={option.name} />
                  </p>
                  <p className="break-words text-meta text-faint">{option.titleLine}</p>
                </div>
                <button type="button" className="btn h-auto max-w-[11rem] shrink-0 whitespace-normal text-left" onClick={() => chooseSpeaker(option)}>
                  Talk about {option.name}
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p className="mt-2 text-meta text-faint">No speaker with that name in the saved catalog.</p>}
        </div>
      )}

      <form
        className="sticky bottom-0 z-10 mt-3 border-t border-line bg-bg py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(text);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-meta text-mute">
            Message
            <textarea
              value={text}
              maxLength={600}
              rows={2}
              disabled={pending}
              aria-label={first ? `Ask anything about talking to ${first}` : "Ask how to introduce yourself"}
              placeholder="Ask about your story, a speaker, or a draft"
              className="field mt-1 resize-y"
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button type="submit" disabled={pending || text.trim().length === 0} className="btn btn-primary shrink-0">
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}

function Chip({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} className="btn h-auto max-w-full py-1 text-left" onClick={onClick}>
      {label}
    </button>
  );
}

function filterSpeakers(speakers: SpeakerOption[], query: string): SpeakerOption[] {
  const needle = query.trim().toLowerCase();
  const pool = needle ? speakers.filter((item) => `${item.name} ${item.titleLine}`.toLowerCase().includes(needle)) : speakers;
  return pool.slice(0, 8);
}

function storedTopics(): string[] {
  try {
    return readStoredTopics(window.localStorage.getItem(TALK_TOPICS_KEY));
  } catch {
    return readStoredTopics(null);
  }
}

function historyContent(item: Bubble): string {
  if (item.role !== "assistant" || !item.draft) return item.content;
  return `Previous draft\nSubject: ${item.draft.subject}\n${item.draft.body}`;
}

function replaceAt(messages: Bubble[], index: number, next: Bubble): Bubble[] {
  return messages.map((item, i) => (i === index ? next : item));
}

async function readReply(res: Response, onDelta: (text: string) => void): Promise<Omit<Bubble, "role">> {
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json") || !res.body) {
    const data = (await res.json().catch(() => null)) as AgentReply | null;
    return {
      content: data?.message || REACH,
      draft: data?.draft ?? null,
      source: data?.source || "fallback",
    };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";
  let final: Omit<Bubble, "role"> | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      try {
        const payload = JSON.parse(line.slice(5).trim()) as {
          delta?: string;
          done?: boolean;
          message?: string;
          draft?: FollowupDraft | null;
          source?: string;
        };
        if (payload.delta) {
          acc += payload.delta;
          onDelta(acc);
        }
        if (payload.done) {
          final = {
            content: payload.message || acc || REACH,
            draft: payload.draft ?? null,
            source: payload.source || "openai",
          };
        }
      } catch {
        // Ignore a partial frame. The next chunk completes it.
      }
    }
  }
  if (final) return final;
  return { content: REACH, draft: null, source: "fallback" };
}
