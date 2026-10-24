import type { PathChip } from "./types";
import { sanitizeCopy } from "./sanitize";
import { humanList } from "./text";

export interface PlanContext {
  name: string;
  title: string;
  company: string;
  sessionTitle: string | null;
  sharedTopics: string[];
  keywordHits: string[];
  pathText: string;
  bioLead: string;
  introName: string | null;
  henryCompany: string;
  henryAbout: string;
  henryCity: string;
  henrySite: string;
  henryPosts: string[];
  henryGoal: string;
  claims: string[];
}

export interface ConversationPlan {
  mode: "openai" | "template";
  why: string;
  angles: string[];
  openers: string[];
  followUp: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["why", "angles", "openers", "follow_up"],
  properties: {
    why: { type: "string" },
    angles: { type: "array", items: { type: "string" } },
    openers: { type: "array", items: { type: "string" } },
    follow_up: { type: "string" },
  },
} as const;

const SYSTEM = [
  "You help an introvert prepare one conversation at a conference.",
  "Use only the facts in the user message. If a fact is missing, do not guess.",
  "Write plain sentences a person can say out loud.",
  "Do not invent employers, schools, clients, or news.",
  "Do not use an em dash or an en dash.",
  "This is not a psychological diagnosis.",
].join(" ");

export function pathText(path: Pick<PathChip, "kind" | "text">[]): string {
  const nodes = path.filter((chip) => chip.kind === "node").map((chip) => chip.text);
  const edges = path.filter((chip) => chip.kind === "edge").map((chip) => chip.text);
  if (edges.includes("INTERESTED_IN") && edges.includes("PRESENTS") && nodes.length >= 2) {
    const topic = nodes[1] || "a shared topic";
    const session = nodes.length >= 4 ? nodes[2] : null;
    const person = nodes[nodes.length - 1];
    if (session) return `The graph path is you, interested in ${topic}, through ${session}, to ${person}.`;
    return `The graph path is you, interested in ${topic}, to ${person}.`;
  }
  if (edges.includes("DESCRIBES") && nodes[1]) {
    return `The graph path matches the word ${nodes[1]} in the public bio to ${nodes[nodes.length - 1]}.`;
  }
  if (nodes.length) return `The graph path runs ${nodes.join(", ")}.`;
  return "The graph path is thin, so this plan stays close to the session and the public bio.";
}

export function templatePlan(ctx: PlanContext): ConversationPlan {
  const first = ctx.name.split(" ")[0] || ctx.name;
  const company = ctx.henryCompany || "Unicorn Studios";
  const city = ctx.henryCity || "San Francisco";
  const sessionBit = ctx.sessionTitle
    ? `their session, ${ctx.sessionTitle}`
    : "the work they are here to talk about";
  const angles: string[] = [];
  angles.push(
    `You build entertainment companies and intellectual property at ${company} in ${city}. With ${first}, connect that to ${sessionBit} in one sentence, then hand them the question.`,
  );
  if (ctx.sharedTopics.length) {
    angles.push(
      `You came to meet people working on ${humanList(ctx.sharedTopics.slice(0, 3))}. Name the one you actually touch, and ask what they want someone outside the team to understand.`,
    );
  }
  if (ctx.henryPosts[0] && angles.length < 3) {
    angles.push(
      `A public post you shared is fair game, and it is a post, not a job title: ${ctx.henryPosts[0]}. Offer that only if it truly touches their work.`,
    );
  } else if (ctx.keywordHits.length && angles.length < 3) {
    angles.push(
      `${first}'s public bio names ${humanList(ctx.keywordHits.slice(0, 3))}. Use one of those words only when you can point at their session.`,
    );
  }
  if (ctx.introName && angles.length < 3) {
    angles.push(
      `If walking up is too much, ${ctx.introName} is on the same session. You can ask for an introduction, and you still open with ${company} yourself.`,
    );
  }
  if (angles.length < 2) {
    angles.push(
      "LinkedIn returned no past roles for you, so do not recite a client list. Stay with Unicorn Studios, San Francisco, and the session in front of you.",
    );
  }
  const topic = ctx.sharedTopics[0] || ctx.keywordHits[0] || "the work";
  const hook = ctx.sessionTitle
    ? `Your session, ${ctx.sessionTitle}, is why I came over`
    : "Your work is why I came over";
  const openers = [
    `I build entertainment companies and intellectual property at Unicorn Studios. ${hook}. How are you thinking about ${topic} for people who are not engineers?`,
    `I am Henry, from Unicorn Studios in San Francisco. I want to ask one specific thing about ${ctx.sessionTitle || "what you are working on"}, then listen.`,
  ];
  const followUp = ctx.sessionTitle
    ? `After you talk, write one note you do not send yet: Unicorn Studios, one idea from ${ctx.sessionTitle}, and a single question. Offer a 15 minute walk.`
    : "After you talk, write one note you do not send yet: who you are at Unicorn Studios, one thing they said, and a single question.";
  const whyLead = ctx.bioLead || `${ctx.name} is on the GitHub Universe schedule.`;
  const share = ctx.sharedTopics.length ? ` You share ${humanList(ctx.sharedTopics.slice(0, 3))}.` : "";
  const why = `${ctx.pathText} ${whyLead}${share} That is the reason to spend the energy on ${first}.`;
  return {
    mode: "template",
    why: sanitizeCopy(why),
    angles: angles.slice(0, 3).map((item) => sanitizeCopy(item)),
    openers: openers.map((item) => sanitizeCopy(item)),
    followUp: sanitizeCopy(followUp),
  };
}

export function parsePlanJson(raw: unknown): ConversationPlan | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const why = clean(row.why, 700);
  const angles = stringList(row.angles).slice(0, 3);
  const openers = stringList(row.openers).slice(0, 2);
  const followUp = clean(row.follow_up ?? row.followUp, 500);
  if (why.length < 40 || angles.length < 2 || openers.length < 2 || followUp.length < 20) return null;
  return { mode: "openai", why, angles, openers, followUp };
}

export async function draftPlan(ctx: PlanContext): Promise<ConversationPlan> {
  const fallback = templatePlan(ctx);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback;
  const model = (process.env.OPENAI_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 700,
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt(ctx) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "conversation_plan",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });
    if (!response.ok) return fallback;
    const text = readOutputText(await response.json());
    if (!text) return fallback;
    return parsePlanJson(text) ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

function userPrompt(ctx: PlanContext): string {
  return [
    "Write a conversation plan for Henry Finn before he walks up to one person.",
    "Use only these facts.",
    `Henry: ${ctx.henryAbout || "no about text"}`,
    `Henry's company: ${ctx.henryCompany}. City: ${ctx.henryCity}. Company site: ${ctx.henrySite}.`,
    "Henry's LinkedIn experience and education were empty. Do not invent clients, jobs, or schools.",
    `Public posts Henry shared: ${ctx.henryPosts.slice(0, 3).join(" | ") || "none"}.`,
    `Demo goal, not a LinkedIn field: ${ctx.henryGoal}`,
    `Person: ${ctx.name}. Title: ${ctx.title}. Company: ${ctx.company}.`,
    `Session: ${ctx.sessionTitle || "none"}.`,
    `Shared topics: ${ctx.sharedTopics.join(", ") || "none"}.`,
    `Bio: ${ctx.bioLead || "none"}`,
    `Graph path: ${ctx.pathText}`,
    "Intel claims:",
    ctx.claims.slice(0, 8).join("\n") || "none",
    "Return why Henry should spend energy here, 2 or 3 angles for how he should talk about himself, 2 openers he can say out loud, and 1 follow-up note he writes later. Nothing is sent.",
  ].join("\n");
}

function readOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as { output_text?: unknown; output?: unknown };
  if (typeof obj.output_text === "string" && obj.output_text.trim()) return obj.output_text;
  if (!Array.isArray(obj.output)) return null;
  const chunks: string[] = [];
  for (const item of obj.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  const joined = chunks.join("").trim();
  return joined || null;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return sanitizeCopy(value).slice(0, max);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item, 400)).filter((item) => item.length >= 12);
}
