import type { FollowupDraft } from "./draft";

export interface SessionFact {
  title: string;
  when: string;
  room: string;
  topics: string[];
}

export interface PersonFacts {
  id: string;
  name: string;
  title: string;
  company: string;
  titleLine: string;
  photoUrl: string;
  bio: string;
  opener: string;
  why: string;
  catchLine: string;
  topics: string[];
  sharedTopics: string[];
  sessions: SessionFact[];
  pathLine: string;
  linkedinUrl: string | null;
  email: string | null;
}

export interface NearbyPerson {
  id: string;
  name: string;
  titleLine: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type AgentSource = "openai" | "fallback" | "budget" | "limit" | "invalid";

export interface AgentReply {
  source: AgentSource;
  message: string;
  draft: FollowupDraft | null;
}

export interface AgentBundle {
  person: PersonFacts | null;
  starter: AgentReply;
  suggestions: string[];
  nearby: NearbyPerson[];
}
