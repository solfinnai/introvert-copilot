import type { AgentReply, AgentSource, PersonFacts } from "./coach-types";
import { demoUser } from "./demo-user";
import { attachChannels, stripDashes, type FollowupDraft } from "./draft";
import { cleanOwnWords, leadWith, parseTalkTopics, supportedCatalogTopic } from "./talk-topics";
import { shortTitle } from "./text";

export const BUDGET_NOTE =
  "The public demo has used today's coaching budget. This plan is from the speaker catalog, so you can still walk over.";
export const OFFLINE_NOTE =
  "The live coach is offline right now. This plan is from the speaker catalog, so you can still walk over.";

export const REVISION_NOTE =
  "The catalog plan cannot rewrite a draft. The card below is the same plan.";

export interface CoachContext {
  topics?: string[];
  ownWords?: string;
}

/** A one-liner is allowed only when every chip it names is selected. */
const ONE_LINER_CHIPS = {
  developers: ["Anime and comics IP", "Building with AI"],
  creators: ["Anime and comics IP", "Building with AI"],
  investors: ["Film for tech companies", "Anime and comics IP"],
} as const;

export function localCoaching(
  source: Extract<AgentSource, "fallback" | "budget">,
  person: PersonFacts | null,
  ask: string,
  context: CoachContext = {},
): AgentReply {
  const prefix = source === "budget" ? BUDGET_NOTE : ask ? OFFLINE_NOTE : "";
  const revision = wantsRevision(ask) ? REVISION_NOTE : "";
  const message = [prefix, revision, coachingText(person, ask, context)].filter(Boolean).join("\n\n");
  const draft = person || wantsDraft(ask) ? makeDraft(person, context) : null;
  return {
    source,
    message: stripDashes(message),
    draft: attachChannels(draft, { email: person?.email, linkedinUrl: person?.linkedinUrl }),
  };
}

function coachingText(person: PersonFacts | null, ask: string, context: CoachContext): string {
  const me = demoUser();
  const topics = context.topics == null ? null : parseTalkTopics(context.topics);
  const ownWords = cleanOwnWords(context.ownWords ?? "");
  const asked = ask.trim();
  const lead = asked ? `You asked: "${asked.slice(0, 140)}".` : "Here is a plan you can say out loud.";
  const topicLine =
    topics == null
      ? ""
      : topics.length
        ? `Topics you are happy to talk about: ${topics.join(", ")}.`
        : "You have not marked any topics you want to talk about.";
  const ownLine = ownWords ? `In your own words: ${ownWords}` : "";
  const audience = audienceFor(person);
  const script = pitchLine(audience, topics);
  if (!person) {
    return [
      lead,
      "Pick someone from Who to meet and the coach will scope this to that person.",
      topicLine,
      ownLine,
      "10 second intro",
      script ?? `I am ${me.name}. I run ${me.company}.`,
      "What to say about you",
      `${me.name} runs ${me.company}.`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  const first = person.name.split(" ")[0];
  const session = person.sessions[0];
  const topic = chosenTopic(person, topics);
  const mapped =
    topics == null
      ? null
      : leadWith({
          chips: topics,
          bio: person.bio,
          sessions: person.sessions.map((item) => ({ title: item.title, topics: item.topics })),
        });
  const neutralOpener = topic
    ? `Your session is why I wanted to say hello. How are you thinking about ${topic}?`
    : "Your session is why I wanted to say hello.";
  const opener = topics == null ? person.opener || neutralOpener : neutralOpener;
  const q1 = session
    ? `In "${session.title}", what should someone who is not an engineer actually take away?`
    : `${first}, what are you hoping people remember from this conversation?`;
  const q2 = person.company
    ? `Where does ${person.company} still need a human story around ${topic ?? "the work"}?`
    : `Which part of ${topic ?? "the work"} do you wish more visitors asked about?`;
  const about = [`${me.name} runs ${me.company}.`];
  if (script) about.push(script);
  if (topic) about.push(`The part that may land with ${first} is ${topic}.`);
  return [
    lead,
    topicLine,
    mapped,
    ownLine,
    "Opener",
    opener,
    "What to say about you",
    about.join("\n\n"),
    "Two questions",
    `1. ${q1}`,
    `2. ${q2}`,
    "The draft is on the card below. You review and send it yourself.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function makeDraft(person: PersonFacts | null, context: CoachContext): FollowupDraft {
  const me = demoUser();
  const topics = context.topics == null ? null : parseTalkTopics(context.topics);
  const script = pitchLine(audienceFor(person), topics);
  const intro = script ?? `I run ${me.company}.`;
  if (!person) {
    const body = `Hi. I am ${me.name}. ${intro} If a short example of that work would be useful, I can send one. ${me.name}`;
    return { subject: "GitHub Universe", body, linkedinNote: "", linkedinUrl: null, email: null };
  }
  const first = person.name.split(" ")[0];
  const session = person.sessions[0];
  const topic = chosenTopic(person, topics);
  const subject = session ? `After ${shortTitle(session.title, 48)}` : `Good to meet you, ${first}`;
  const open = session
    ? `Hi ${first}. Your session, ${session.title}, is on the GitHub Universe schedule.`
    : `Hi ${first}. I saw that you are at GitHub Universe.`;
  const body = [
    open,
    topic ? `${intro} I am spending this week on ${topic}.` : intro,
    "If you are open to it, I would like to send one short example of the work.",
    "Would a two-line reply be useful, or should I leave it here?",
    me.name,
  ].join(" ");
  return { subject, body, linkedinNote: "", linkedinUrl: null, email: null };
}

function chosenTopic(person: PersonFacts, topics: string[] | null): string | null {
  if (topics == null) return person.sharedTopics[0] || person.topics[0] || null;
  return supportedCatalogTopic(topics, [...person.sharedTopics, ...person.topics]);
}

function audienceFor(person: PersonFacts | null): keyof typeof ONE_LINER_CHIPS {
  if (!person) return "developers";
  const blob = `${person.title} ${person.titleLine} ${person.company} ${person.topics.join(" ")}`.toLowerCase();
  if (/\binvestor|venture|capital\b/.test(blob)) return "investors";
  if (/\bengineer|developer|engineering|github|software|open source\b/.test(blob)) return "developers";
  return "creators";
}

function pitchLine(audience: keyof typeof ONE_LINER_CHIPS, topics: string[] | null): string | null {
  const me = demoUser();
  if (topics != null) {
    const selected = new Set(topics);
    if (!ONE_LINER_CHIPS[audience].every((chip) => selected.has(chip))) return null;
  }
  return me.oneLiners[audience];
}

function wantsRevision(ask: string): boolean {
  return /\b(shorter|longer|warmer|colder|softer|rewrite|revise|edit|tweak)\b/i.test(ask);
}

function wantsDraft(ask: string): boolean {
  return /follow-?up|draft|message|email|linkedin|what to send|write to/i.test(ask);
}
