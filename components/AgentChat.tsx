"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DraftCard } from "./DraftCard";
import { PersonPhoto } from "./PersonPhoto";
import type { AgentBundle, AgentReply } from "@/lib/coach-types";
import type { FollowupDraft } from "@/lib/draft";
import { localCoaching } from "@/lib/coach-copy";
import { cleanOwnWords, leadWith, OWN_WORDS_KEY, readStoredTopics, TALK_TOPICS_KEY } from "@/lib/talk-topics";

interface Bubble {
  role: "user" | "assistant";
  content: string;
  draft: FollowupDraft | null;
  source: string;
}

const REACH = "The coach could not be reached. The catalog plan above still works.";

export function AgentChat({ bundle }: { bundle: AgentBundle }) {
  const starter = bundle.starter;
  const [messages, setMessages] = useState<Bubble[]>([
    { role: "assistant", content: starter.message, draft: starter.draft, source: "catalog" },
  ]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [lead, setLead] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const person = bundle.person;
  const personKey = person?.id ?? "";
  const seenPerson = useRef<string | null>(null);
  const first = person?.name.split(" ")[0];

  useEffect(() => {
    const stored = storedCoachContext();
    const switched = seenPerson.current !== null && seenPerson.current !== personKey;
    seenPerson.current = personKey;
    const line = person
      ? leadWith({
          chips: stored.topics,
          bio: person.bio,
          sessions: person.sessions.map((session) => ({ title: session.title, topics: session.topics })),
        })
      : null;
    setLead(line);
    const plan = localCoaching("fallback", person, "", stored);
    const content = line && !plan.message.includes(line) ? `${plan.message}\n\n${line}` : plan.message;
    setMessages((current) => {
      const stillStarter = current.length === 1 && current[0]?.role === "assistant";
      if (!switched && !stillStarter) return current;
      if (
        !switched &&
        current.length === 1 &&
        current[0].content === content &&
        current[0].draft?.body === plan.draft?.body
      ) {
        return current;
      }
      return [{ role: "assistant", content, draft: plan.draft, source: "catalog" }];
    });
  }, [person, personKey]);

  async function ask(raw: string) {
    const content = raw.trim();
    if (!content || pending) return;
    const history: Bubble[] = [
      ...messages,
      { role: "user", content, draft: null, source: "" },
      { role: "assistant", content: "Thinking...", draft: null, source: "" },
    ];
    const pendingIndex = history.length - 1;
    setMessages(history);
    setText("");
    setPending(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person?.id ?? null,
          messages: history.slice(0, -1).map((item) => ({ role: item.role, content: historyContent(item) })),
          ...storedCoachContext(),
        }),
      });
      const reply = await readReply(res, (partial) => {
        setMessages((current) => replaceAt(current, pendingIndex, { role: "assistant", content: partial, draft: null, source: "openai" }));
      });
      setMessages((current) => replaceAt(current, pendingIndex, { role: "assistant", ...reply }));
    } catch {
      setMessages((current) =>
        replaceAt(current, pendingIndex, { role: "assistant", content: REACH, draft: starter.draft, source: "fallback" }),
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
      });
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <aside className="order-1 min-w-0 space-y-4 lg:order-2">
        <section className="rounded-3xl border border-line bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Scoped to</p>
          {person ? (
            <div className="mt-3 flex items-start gap-3">
              <PersonPhoto src={person.photoUrl} name={person.name} size={44} />
              <div className="min-w-0">
                <p className="break-words font-semibold">{person.name}</p>
                <p className="break-words text-sm text-mute">{person.titleLine}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6">
              Open Ask agent from a person card, or pick someone below.
            </p>
          )}
          {person?.catchLine && <p className="mt-3 break-words text-sm text-mute">Catch them: {person.catchLine}</p>}
          {person && person.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.topics.map((topic) => (
                <span key={topic} className="rounded-full border border-line bg-white px-2 py-1 text-xs">
                  {topic}
                </span>
              ))}
            </div>
          )}
          {person?.sessions[0] && (
            <p className="mt-3 break-words text-sm leading-6">
              {person.sessions[0].title}
              {person.sessions[0].when ? `, ${person.sessions[0].when}` : ""}
              {person.sessions[0].room ? `, ${person.sessions[0].room}` : ""}
            </p>
          )}
          {lead && <p className="mt-3 break-words text-sm leading-6">{lead}</p>}
          {person?.pathLine && <p className="mt-3 break-words font-mono text-[11px] leading-5 text-mute">{person.pathLine}</p>}
          <Link href="/meet" className="mt-4 inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm">
            Back to who to meet
          </Link>
        </section>
        {!person && bundle.nearby.length > 0 && (
          <section className="rounded-3xl border border-line bg-card p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mute">From the graph</p>
            <ul className="mt-3 space-y-2">
              {bundle.nearby.map((item) => (
                <li key={item.id}>
                  <Link href={`/agent?person=${item.id}`} className="block break-words text-sm font-semibold">
                    {item.name}
                  </Link>
                  <p className="break-words text-xs text-mute">{item.titleLine}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <section className="order-2 min-w-0 lg:order-1">
        <h1 className="break-words font-serif text-3xl tracking-tight md:text-4xl">
          {first ? `Talking about ${first}` : "Ask the agent"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
          Coaching for how you introduce yourself. The draft stays on this page until you open it in your own email,
          copy it, or share it.
        </p>
        <div ref={scroller} className="mt-5 max-h-[min(62vh,560px)] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={item.role === "user" ? "flex justify-end" : ""}>
              <div
                className={`max-w-full break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[40rem] ${
                  item.role === "user" ? "bg-ink text-white" : "border border-line bg-white"
                }`}
              >
                {item.role === "assistant" && item.source && (
                  <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-mute">{sourceLabel(item.source)}</p>
                )}
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.draft && <DraftCard draft={item.draft} />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {bundle.suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              className="max-w-full rounded-full border border-line bg-white px-3 py-1.5 text-left text-sm leading-5 disabled:opacity-50"
              onClick={() => void ask(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(text);
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Ask the agent</span>
            <textarea
              value={text}
              maxLength={600}
              rows={2}
              disabled={pending}
              placeholder={first ? `Ask anything about talking to ${first}` : "Ask how to introduce yourself"}
              className="w-full min-w-0 resize-y rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6"
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={pending || text.trim().length === 0}
            className="shrink-0 rounded-full bg-ink px-4 py-3 text-sm text-white disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </section>
    </div>
  );
}

function storedCoachContext(): { topics: string[]; ownWords: string } {
  try {
    return {
      topics: readStoredTopics(window.localStorage.getItem(TALK_TOPICS_KEY)),
      ownWords: cleanOwnWords(window.localStorage.getItem(OWN_WORDS_KEY) ?? ""),
    };
  } catch {
    return { topics: readStoredTopics(null), ownWords: "" };
  }
}

function historyContent(item: Bubble): string {
  if (item.role !== "assistant" || !item.draft) return item.content;
  return `Previous draft\nSubject: ${item.draft.subject}\n${item.draft.body}`;
}

function sourceLabel(source: string): string {
  if (source === "openai") return "Live coach";
  if (source === "budget") return "Today's budget";
  if (source === "limit") return "Slow down";
  if (source === "invalid") return "Try again";
  if (source === "fallback" || source === "catalog") return "Catalog plan";
  return "";
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
