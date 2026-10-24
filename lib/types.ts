export type DayFilter = "both" | "wed" | "thu";

export type GraphBackend = "falkordb" | "memory";

export interface PathChip {
  kind: "node" | "edge" | "note";
  text: string;
  tone: "solid" | "plain";
}

export interface IntroVia {
  id: string;
  name: string;
}

export interface SourceRef {
  label: string;
  url: string;
}

export interface RankedPerson {
  id: string;
  name: string;
  titleLine: string;
  title: string;
  company: string;
  photoUrl: string;
  linkedinUrl: string | null;
  score: number;
  why: string;
  opener: string;
  catchLine: string;
  sessionTitle: string | null;
  sessionType: string | null;
  roomShort: string;
  dayKey: "wed" | "thu" | "other";
  dayLabel: string;
  startLabel: string;
  sharedTopics: string[];
  sessionTopics: string[];
  keywordHits: string[];
  introVia: IntroVia | null;
  path: PathChip[];
  introPath: PathChip[];
  hops: number;
  sources: SourceRef[];
  bio: string;
}

export interface MeetResponse {
  backend: GraphBackend;
  ms: number;
  speakerCount: number;
  sessionCount: number;
  fetchedLabel: string;
  cypher: string;
  people: RankedPerson[];
}

export interface HealthReport {
  ok: boolean;
  backend: GraphBackend;
  nodes: number;
  edges: number;
}

export interface RecommendQuery {
  day: DayFilter;
  metIds: string[];
  interests?: string[];
  /** Chips Henry marked on Your story. They annotate why, they do not change the score. */
  talkTopics?: string[];
  limit?: number;
}
