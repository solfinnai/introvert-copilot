import type { Catalog, SessionNode } from "./catalog";
import { humanList, startMinutes } from "./text";

export const SPEAKER_PAGE_SIZE = 24;

export type SpeakerDay = "all" | "wed" | "thu";
export type SpeakerSort = "name" | "company" | "time";

export interface SpeakerQuery {
  q: string;
  day: SpeakerDay;
  topic: string;
  sort: SpeakerSort;
}

export interface SpeakerListState extends SpeakerQuery {
  page: number;
}

export interface DirectorySession {
  title: string;
  type: string;
  dayKey: "wed" | "thu" | "other";
  dayLabel: string;
  timeLabel: string;
  roomLabel: string;
  topics: string[];
}

export interface DirectorySpeaker {
  id: string;
  name: string;
  title: string;
  company: string;
  titleLine: string;
  photoUrl: string;
  topics: string[];
  sessions: DirectorySession[];
}

export interface ScheduleStop {
  personId: string;
  name: string;
  sessionTitle: string;
  dayKey: "wed" | "thu" | "other";
  dayLabel: string;
  timeLabel: string;
  roomLabel: string;
  minutes: number;
  conflict: boolean;
}

export interface ScheduleConflict {
  timeLabel: string;
  names: string[];
  note: string;
}

export interface ScheduleDay {
  dayKey: string;
  label: string;
  stops: ScheduleStop[];
  conflicts: ScheduleConflict[];
}

export interface SavedSchedule {
  days: ScheduleDay[];
  missing: { id: string; name: string }[];
}

const DAY_RANK: Record<DirectorySession["dayKey"], number> = { wed: 0, thu: 1, other: 2 };

export function directoryFromCatalog(catalog: Catalog): { speakers: DirectorySpeaker[]; topics: string[] } {
  const speakers = catalog.people.map((person) => {
    const sessions = sessionsForPerson(catalog, person.id);
    const topics = uniqueSorted(sessions.flatMap((session) => session.topics));
    return {
      id: person.id,
      name: person.name,
      title: person.title,
      company: person.company,
      titleLine: titleLine(person.title, person.company),
      photoUrl: person.photoUrl,
      topics,
      sessions,
    };
  });
  const topics = uniqueSorted(speakers.flatMap((speaker) => speaker.topics));
  return { speakers, topics };
}

export function sessionsForPerson(catalog: Catalog, id: string): DirectorySession[] {
  const person = catalog.peopleById.get(id);
  if (!person) return [];
  const sessions: DirectorySession[] = [];
  for (const sid of person.sessionIds) {
    const session = catalog.sessionsById.get(sid);
    if (session) sessions.push(toDirectorySession(session));
  }
  sessions.sort(compareSessions);
  return sessions;
}

export function querySpeakers(speakers: DirectorySpeaker[], query: SpeakerQuery): DirectorySpeaker[] {
  const q = query.q.trim().toLowerCase();
  const topic = query.topic.trim();
  const rows = speakers.filter((speaker) => {
    const onDay = sessionsOnDay(speaker, query.day);
    if (query.day !== "all" && onDay.length === 0) return false;
    if (topic && !onDay.some((session) => session.topics.includes(topic))) return false;
    if (!q) return true;
    if (speaker.name.toLowerCase().includes(q)) return true;
    if (speaker.company.toLowerCase().includes(q)) return true;
    const topicPool = query.day === "all" ? speaker.topics : onDay.flatMap((session) => session.topics);
    if (topicPool.some((item) => item.toLowerCase().includes(q))) return true;
    return false;
  });
  return [...rows].sort((a, b) => compareSpeakers(a, b, query));
}

export function sessionsOnDay(speaker: DirectorySpeaker, day: SpeakerDay): DirectorySession[] {
  if (day === "all") return speaker.sessions;
  return speaker.sessions.filter((session) => session.dayKey === day);
}

export function paginate<T>(rows: T[], page: number, pageSize = SPEAKER_PAGE_SIZE): {
  page: number;
  pages: number;
  total: number;
  start: number;
  end: number;
  rows: T[];
} {
  const size = Math.max(1, Math.floor(pageSize));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const current = Math.min(Math.max(1, requested), pages);
  const startIndex = (current - 1) * size;
  const slice = rows.slice(startIndex, startIndex + size);
  return {
    page: current,
    pages,
    total,
    start: total === 0 ? 0 : startIndex + 1,
    end: startIndex + slice.length,
    rows: slice,
  };
}

export function formatSessionLine(session: Pick<DirectorySession, "dayLabel" | "timeLabel" | "roomLabel">): string {
  const day = session.dayLabel.trim() || "Day not listed";
  const time = session.timeLabel.trim() || "time not listed";
  const room = session.roomLabel.trim() || "room not listed";
  return `${day}, ${time}, ${room}`;
}

/** Day, time, room, and session type. Skip a type the room name already states. */
export function formatSessionDetail(
  session: Pick<DirectorySession, "dayLabel" | "timeLabel" | "roomLabel" | "type">,
): string {
  const line = formatSessionLine(session);
  const type = session.type.trim();
  if (!type || typeRepeatsRoom(type, session.roomLabel)) return line;
  return `${line}, ${type}`;
}

function typeRepeatsRoom(type: string, roomLabel: string): boolean {
  const room = roomLabel.split(" @ ")[0].trim().toLowerCase();
  const kind = type.trim().toLowerCase();
  if (!room || !kind) return false;
  return room === kind || room === `${kind}s` || kind === `${room}s`;
}

export function formatTimePlace(session: Pick<DirectorySession, "timeLabel" | "roomLabel">): string {
  const time = session.timeLabel.trim() || "time not listed";
  const room = session.roomLabel.trim() || "room not listed";
  return `${time}, ${room}`;
}

export function directoryOpener(speaker: DirectorySpeaker): string {
  const title = speaker.sessions.find((session) => session.title.trim())?.title.trim() ?? "";
  if (!title) return "";
  const short = title.length > 90 ? `${title.slice(0, 87).trim()}...` : title;
  return `Ask about ${short}.`;
}

export function directoryCatchLine(speaker: DirectorySpeaker): string {
  const session = speaker.sessions[0];
  if (!session) return "Time to be confirmed";
  const room = session.roomLabel.split(" @ ")[0].trim() || "the venue";
  const day = session.dayKey === "wed" ? "Wed" : session.dayKey === "thu" ? "Thu" : session.dayLabel || "Day not listed";
  const time = session.timeLabel.trim() || "time to be confirmed";
  return `${room}, ${day} ${time}`.replace(/\s+/g, " ").trim();
}

export function parseSpeakerListState(input: {
  q?: string | string[];
  day?: string | string[];
  topic?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}): SpeakerListState {
  const q = firstParam(input.q).slice(0, 80);
  const dayRaw = firstParam(input.day);
  const day: SpeakerDay = dayRaw === "wed" || dayRaw === "thu" ? dayRaw : "all";
  const topic = firstParam(input.topic).slice(0, 120);
  const sortRaw = firstParam(input.sort);
  const sort: SpeakerSort = sortRaw === "company" || sortRaw === "time" ? sortRaw : "name";
  const parsedPage = Number.parseInt(firstParam(input.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.min(parsedPage, 999) : 1;
  return { q, day, topic, sort, page };
}

export function speakerListSearch(state: SpeakerListState): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q);
  if (state.day !== "all") params.set("day", state.day);
  const topic = state.topic.trim();
  if (topic) params.set("topic", topic);
  if (state.sort !== "name") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export function personHref(id: string): string {
  return `/people/${id}`;
}

export function reportHref(id: string): string {
  return `/people/${id}?report=1#report`;
}

export function agentHref(id: string): string {
  return `/agent?person=${id}`;
}

export function reportDownloadHref(id: string): string {
  return `/api/people/${id}/report`;
}

export function buildSchedule(
  speakers: DirectorySpeaker[],
  saved: { id: string; name: string }[],
): SavedSchedule {
  const byId = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const missing: { id: string; name: string }[] = [];
  const buckets = new Map<string, ScheduleStop[]>();
  for (const person of saved) {
    const speaker = byId.get(person.id);
    if (!speaker || speaker.sessions.length === 0) {
      missing.push({ id: person.id, name: person.name || speaker?.name || "Saved person" });
      continue;
    }
    for (const session of speaker.sessions) {
      const stop: ScheduleStop = {
        personId: speaker.id,
        name: speaker.name,
        sessionTitle: session.title.trim() || "Session title not listed",
        dayKey: session.dayKey,
        dayLabel: session.dayLabel.trim(),
        timeLabel: session.timeLabel.trim(),
        roomLabel: session.roomLabel.trim(),
        minutes: startMinutes(session.timeLabel),
        conflict: false,
      };
      const list = buckets.get(session.dayKey) ?? [];
      list.push(stop);
      buckets.set(session.dayKey, list);
    }
  }
  const days: ScheduleDay[] = [...buckets.entries()]
    .sort((a, b) => (DAY_RANK[a[0] as DirectorySession["dayKey"]] ?? 9) - (DAY_RANK[b[0] as DirectorySession["dayKey"]] ?? 9))
    .map(([dayKey, stops]) => {
      stops.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name, "en") || a.sessionTitle.localeCompare(b.sessionTitle, "en"));
      const conflicts = conflictsFor(stops);
      const label = stops.find((stop) => stop.dayLabel)?.dayLabel || (dayKey === "other" ? "Day not listed" : dayKey);
      return { dayKey, label, stops, conflicts };
    });
  return { days, missing };
}

function conflictsFor(stops: ScheduleStop[]): ScheduleConflict[] {
  const byTime = new Map<number, ScheduleStop[]>();
  for (const stop of stops) {
    if (!stop.timeLabel || stop.minutes >= 24 * 60) continue;
    const list = byTime.get(stop.minutes) ?? [];
    list.push(stop);
    byTime.set(stop.minutes, list);
  }
  const conflicts: ScheduleConflict[] = [];
  for (const list of byTime.values()) {
    const ids = new Set(list.map((stop) => stop.personId));
    if (ids.size < 2) continue;
    for (const stop of list) stop.conflict = true;
    const names = [...new Set(list.map((stop) => stop.name))].sort((a, b) => a.localeCompare(b, "en"));
    const timeLabel = list[0]?.timeLabel || "the same time";
    conflicts.push({ timeLabel, names, note: conflictLine(names, timeLabel) });
  }
  conflicts.sort((a, b) => startMinutes(a.timeLabel) - startMinutes(b.timeLabel));
  return conflicts;
}

function conflictLine(names: string[], timeLabel: string): string {
  const who = humanList(names);
  if (names.length === 2) {
    return `Heads up. ${who} are both on at ${timeLabel}. Pick one so you are not in two places.`;
  }
  return `Heads up. ${who} are all on at ${timeLabel}. Pick one so you are not in two places.`;
}

function compareSpeakers(a: DirectorySpeaker, b: DirectorySpeaker, query: SpeakerQuery): number {
  if (query.sort === "company") {
    const company = companyRank(a) - companyRank(b);
    if (company) return company;
    const byCompany = a.company.localeCompare(b.company, "en");
    if (byCompany) return byCompany;
  }
  if (query.sort === "time") {
    const time = earliestMinutes(a, query.day) - earliestMinutes(b, query.day);
    if (time) return time;
  }
  return a.name.localeCompare(b.name, "en");
}

function companyRank(speaker: DirectorySpeaker): number {
  return speaker.company.trim() ? 0 : 1;
}

function earliestMinutes(speaker: DirectorySpeaker, day: SpeakerDay): number {
  const sessions = sessionsOnDay(speaker, day);
  if (!sessions.length) return 24 * 60 + 1;
  return Math.min(...sessions.map((session) => startMinutes(session.timeLabel)));
}

function toDirectorySession(session: SessionNode): DirectorySession {
  return {
    title: session.title.trim(),
    type: session.type.trim(),
    dayKey: session.dayKey,
    dayLabel: formatDay(session.dayName, session.date),
    timeLabel: session.startLabel.trim(),
    roomLabel: session.room.trim(),
    topics: [...session.topics],
  };
}

function compareSessions(a: DirectorySession, b: DirectorySession): number {
  const day = DAY_RANK[a.dayKey] - DAY_RANK[b.dayKey];
  if (day) return day;
  const time = startMinutes(a.timeLabel) - startMinutes(b.timeLabel);
  if (time) return time;
  return a.title.localeCompare(b.title, "en");
}

function formatDay(dayName: string, date: string): string {
  const name = dayName.trim();
  const iso = date.trim();
  if (!name && !iso) return "";
  if (!iso) return name;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return name || iso;
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return name ? `${name}, ${monthDay}` : monthDay;
}

function titleLine(title: string, company: string): string {
  if (!title) return company;
  if (!company) return title;
  if (title.toLowerCase().includes(company.toLowerCase())) return title;
  return `${title}, ${company}`;
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
}
