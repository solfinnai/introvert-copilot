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
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <aside className="order-1 min-w-0 space-y-3 lg:order-2">
        <section className="panel p-3">
          <p className="text-meta text-faint">Scoped to</p>
          {person ? (
            <div className="mt-2 flex items-start gap-3">
              <PersonPhoto src={person.photoUrl} name={person.name} size={32} />
              <div className="min-w-0">
                <p className="break-words text-body font-medium">{person.name}</p>
                <p className="break-words text-meta text-mute">{person.titleLine}</p>
              </div>
            </div>
          ) : (
            <p className="measure mt-2 text-body leading-5">Open Ask agent from a person row, or pick someone below.</p>
          )}
          {person?.catchLine && <p className="mt-2 break-words text-meta text-faint">Catch them: {person.catchLine}</p>}
          {person && person.topics.length > 0 && (
            <p className="mt-2 break-words text-meta text-faint">{person.topics.join(", ")}</p>
          )}
          {person?.sessions[0] && (
            <p className="mt-2 break-words text-meta leading-4 text-mute">
              {person.sessions[0].title}
              {person.sessions[0].when ? `, ${person.sessions[0].when}` : ""}
              {person.sessions[0].room ? `, ${person.sessions[0].room}` : ""}
            </p>
          )}
          {lead && <p className="measure mt-2 break-words text-body leading-5">{lead}</p>}
          {person?.pathLine && <p className="mt-2 break-words font-mono text-meta leading-4 text-faint">{person.pathLine}</p>}
          <Link href="/meet" className="btn mt-3">
            Back to who to meet
          </Link>
        </section>
        {!person && bundle.nearby.length > 0 && (
          <section className="panel p-3">
            <p className="text-meta text-faint">From the graph</p>
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {bundle.nearby.map((item) => (
                <li key={item.id} className="py-2">
                  <Link href={`/agent?person=${item.id}`} className="block break-words text-body font-medium text-accent hover:underline">
                    {item.name}
                  </Link>
                  <p className="break-words text-meta text-faint">{item.titleLine}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <section className="order-2 min-w-0 lg:order-1">
        <h1 className="type-display break-words text-[22px] leading-7">{first ? `Talking about ${first}` : "Ask the agent"}</h1>
        <p className="measure mt-1 text-body leading-5 text-mute">
          Coaching for how you introduce yourself. The draft stays on this page until you open it in your own email, copy it, or share it.
        </p>
        <div ref={scroller} className="panel mt-4 max-h-[min(62vh,560px)] divide-y divide-line overflow-y-auto" aria-live="polite">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className="px-3 py-3">
              <p className="text-meta text-faint">{item.role === "user" ? "You" : sourceLabel(item.source) || "Agent"}</p>
              <p className="measure mt-1 whitespace-pre-wrap break-words text-body leading-5">{item.content}</p>
              {item.draft && <DraftCard draft={item.draft} />}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bundle.suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              className="btn h-auto max-w-full py-1 text-left"
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
          <label className="min-w-0 flex-1 text-meta text-mute">
            Message
            <textarea
              value={text}
              maxLength={600}
              rows={2}
              disabled={pending}
              aria-label={first ? `Ask anything about talking to ${first}` : "Ask how to introduce yourself"}
              className="field mt-1 resize-y"
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button type="submit" disabled={pending || text.trim().length === 0} className="btn btn-primary shrink-0">
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
