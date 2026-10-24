import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import { startMinutes } from "./text";
import {
  SPEAKER_PAGE_SIZE,
  agentHref,
  buildSchedule,
  directoryCatchLine,
  directoryFromCatalog,
  directoryOpener,
  formatSessionDetail,
  formatSessionLine,
  paginate,
  personHref,
  querySpeakers,
  reportDownloadHref,
  reportHref,
  sessionsOnDay,
  type DirectorySpeaker,
} from "./speakers";

const DASH = /[\u2013\u2014]/;

test("the directory lists every catalog speaker and their sessions", () => {
  const catalog = getCatalog();
  const { speakers, topics } = directoryFromCatalog(catalog);
  assert.equal(speakers.length, catalog.people.length);
  assert.equal(new Set(speakers.map((speaker) => speaker.id)).size, speakers.length);
  for (const person of catalog.people) {
    const row = speakers.find((speaker) => speaker.id === person.id);
    assert.ok(row, person.id);
    assert.equal(row.sessions.length, person.sessionIds.length);
    assert.equal(DASH.test(JSON.stringify(row)), false);
    for (const session of row.sessions) {
      assert.ok(session.dayLabel, `${person.name} day`);
      assert.ok(session.timeLabel, `${person.name} time`);
      assert.ok(session.roomLabel.includes("@") || session.roomLabel.length > 0, `${person.name} room`);
    }
  }
  assert.ok(topics.includes("AI: Agents"));
  assert.ok(speakers.some((speaker) => speaker.sessions.some((session) => session.type === "Keynote")));
  assert.ok(speakers.some((speaker) => speaker.sessions.some((session) => session.type === "Session After Party")));
  const both = speakers.filter((speaker) => sessionsOnDay(speaker, "wed").length && sessionsOnDay(speaker, "thu").length);
  assert.ok(both.length > 0);
});

test("search, day, topic, and sort stay on the speaker fields", () => {
  const { speakers } = directoryFromCatalog(getCatalog());
  const byName = querySpeakers(speakers, { q: "maeda", day: "all", topic: "", sort: "name" });
  assert.ok(byName.some((speaker) => /maeda/i.test(speaker.name)));
  const github = querySpeakers(speakers, { q: "github", day: "all", topic: "", sort: "company" });
  assert.ok(github.length > 0);
  assert.ok(github.every((speaker) => /github/i.test(`${speaker.name} ${speaker.company} ${speaker.topics.join(" ")}`)));
  const agents = querySpeakers(speakers, { q: "agents", day: "all", topic: "", sort: "name" });
  assert.ok(agents.length > 0);
  assert.ok(agents.every((speaker) => speaker.topics.some((topic) => /agents/i.test(topic))));
  const wed = querySpeakers(speakers, { q: "", day: "wed", topic: "", sort: "time" });
  assert.ok(wed.length > 0 && wed.length < speakers.length);
  assert.ok(wed.every((speaker) => speaker.sessions.some((session) => session.dayKey === "wed")));
  for (let i = 1; i < wed.length; i += 1) {
    const prev = Math.min(...sessionsOnDay(wed[i - 1], "wed").map((session) => startMinutes(session.timeLabel)));
    const next = Math.min(...sessionsOnDay(wed[i], "wed").map((session) => startMinutes(session.timeLabel)));
    assert.ok(prev <= next);
  }
  const topic = "Kubernetes";
  const kube = querySpeakers(speakers, { q: "", day: "all", topic, sort: "name" });
  assert.ok(kube.length > 0);
  assert.ok(kube.every((speaker) => speaker.sessions.some((session) => session.topics.includes(topic))));
  const hidden = speaker("ada", "Ada", [session("wed", "Wednesday, Oct 28", "1:30 PM", "Hall", "Very Unique Session Zzzz")]);
  assert.equal(querySpeakers([hidden], { q: "zzzz", day: "all", topic: "", sort: "name" }).length, 0);
  assert.equal(querySpeakers([hidden], { q: "ada", day: "all", topic: "", sort: "name" }).length, 1);
  assert.equal(querySpeakers([hidden], { q: "example", day: "all", topic: "", sort: "name" }).length, 1);
});

test("pagination covers every row and never renders the whole list at once", () => {
  const { speakers } = directoryFromCatalog(getCatalog());
  const seen: string[] = [];
  let page = 1;
  let guard = 0;
  while (guard < 20) {
    const view = paginate(speakers, page);
    assert.ok(view.rows.length <= SPEAKER_PAGE_SIZE);
    seen.push(...view.rows.map((speaker) => speaker.id));
    if (page >= view.pages) break;
    page += 1;
    guard += 1;
  }
  assert.equal(seen.length, speakers.length);
  assert.equal(new Set(seen).size, speakers.length);
  assert.equal(paginate(speakers, 99).page, paginate(speakers, 1).pages);
  assert.equal(paginate([], 3).start, 0);
});

test("unknown day, time, and room stay honest", () => {
  assert.equal(
    formatSessionLine({ dayLabel: "", timeLabel: "", roomLabel: "" }),
    "Day not listed, time not listed, room not listed",
  );
  assert.equal(DASH.test(formatSessionLine({ dayLabel: "Wednesday, Oct 28", timeLabel: "1:30 PM", roomLabel: "Main Stage" })), false);
  assert.equal(
    formatSessionDetail({
      dayLabel: "Wednesday, Oct 28",
      timeLabel: "4:10 PM",
      roomLabel: "Main Stage @ Festival Pavilion",
      type: "Main Stage",
    }),
    "Wednesday, Oct 28, 4:10 PM, Main Stage @ Festival Pavilion",
  );
  assert.equal(
    formatSessionDetail({
      dayLabel: "Wednesday, Oct 28",
      timeLabel: "4:10 PM",
      roomLabel: "Workshops @ Gateway Pavilion, Level 1",
      type: "Workshop",
    }),
    "Wednesday, Oct 28, 4:10 PM, Workshops @ Gateway Pavilion, Level 1",
  );
  assert.equal(
    formatSessionDetail({
      dayLabel: "Thursday, Oct 29",
      timeLabel: "1:05 PM",
      roomLabel: "Main Stage @ Festival Pavilion",
      type: "Keynote",
    }),
    "Thursday, Oct 29, 1:05 PM, Main Stage @ Festival Pavilion, Keynote",
  );
});

test("saved schedule groups days and flags same-time clashes only", () => {
  const ada = speaker("ada", "Ada", [
    session("wed", "Wednesday, Oct 28", "1:30 PM", "Main Stage @ Festival Pavilion", "Agents"),
    session("thu", "Thursday, Oct 29", "9:00 AM", "Workshops @ Gateway", "Agents late"),
  ]);
  const grace = speaker("grace", "Grace", [
    session("wed", "Wednesday, Oct 28", "1:30 PM", "Cowell Theater @ Gateway", "Other"),
  ]);
  const lin = speaker("lin", "Lin", [
    session("wed", "Wednesday, Oct 28", "3:45 PM", "Demos @ Gateway", "Demos"),
  ]);
  const schedule = buildSchedule([ada, grace, lin], [
    { id: "ada", name: "Ada" },
    { id: "grace", name: "Grace" },
    { id: "lin", name: "Lin" },
    { id: "missing", name: "Nobody" },
  ]);
  assert.deepEqual(
    schedule.days.map((day) => day.dayKey),
    ["wed", "thu"],
  );
  const wednesday = schedule.days[0];
  assert.equal(wednesday.conflicts.length, 1);
  assert.match(wednesday.conflicts[0].note, /Ada and Grace are both on at 1:30 PM/);
  assert.equal(DASH.test(wednesday.conflicts[0].note), false);
  assert.equal(wednesday.stops.filter((stop) => stop.conflict).length, 2);
  assert.equal(wednesday.stops.find((stop) => stop.personId === "lin")?.conflict, false);
  assert.equal(schedule.days[1].conflicts.length, 0);
  assert.deepEqual(schedule.missing, [{ id: "missing", name: "Nobody" }]);
  assert.match(directoryOpener(ada), /^Ask about Agents\.$/);
  assert.match(directoryCatchLine(ada), /Wed 1:30 PM/);
});

test("three people in one slot are named without a dash", () => {
  const rows = ["Ada", "Grace", "Lin"].map((name) =>
    speaker(name.toLowerCase(), name, [session("thu", "Thursday, Oct 29", "11:00 AM", "Hall", "Talk")]),
  );
  const schedule = buildSchedule(rows, rows.map((row) => ({ id: row.id, name: row.name })));
  assert.equal(schedule.days[0].conflicts.length, 1);
  assert.match(schedule.days[0].conflicts[0].note, /Ada, Grace and Lin are all on at 11:00 AM/);
});

test("directory links and pages do not fetch intel for the list", () => {
  const root = process.cwd();
  const page = fs.readFileSync(path.join(root, "app/speakers/page.tsx"), "utf8");
  const ui = fs.readFileSync(path.join(root, "components/SpeakerDirectory.tsx"), "utf8");
  const saved = fs.readFileSync(path.join(root, "app/saved/page.tsx"), "utf8");
  const board = fs.readFileSync(path.join(root, "components/SavedBoard.tsx"), "utf8");
  const report = fs.readFileSync(path.join(root, "app/api/people/[id]/report/route.ts"), "utf8");
  assert.equal(/brightdata|loadPersonBrief|person-brief/.test(page + ui + saved), false);
  assert.match(ui, /Get full report/);
  assert.match(ui, /reportHref/);
  assert.match(board, /Get full report/);
  assert.match(board, /buildSchedule/);
  const rateAt = report.indexOf("rateLimit");
  const fetchAt = report.indexOf("loadPersonBrief");
  assert.ok(rateAt > -1 && fetchAt > rateAt);
  assert.equal(reportHref("ada-lovelace"), "/people/ada-lovelace?report=1#report");
  assert.equal(personHref("ada-lovelace"), "/people/ada-lovelace");
  assert.equal(agentHref("ada-lovelace"), "/agent?person=ada-lovelace");
  assert.equal(reportDownloadHref("ada-lovelace"), "/api/people/ada-lovelace/report");
});

function speaker(id: string, name: string, sessions: DirectorySpeaker["sessions"]): DirectorySpeaker {
  return {
    id,
    name,
    title: "Engineer",
    company: "Example",
    titleLine: "Engineer, Example",
    photoUrl: "",
    topics: [...new Set(sessions.flatMap((session) => session.topics))],
    sessions,
  };
}

function session(
  dayKey: "wed" | "thu",
  dayLabel: string,
  timeLabel: string,
  roomLabel: string,
  title: string,
): DirectorySpeaker["sessions"][number] {
  return { title, type: "Breakout Session", dayKey, dayLabel, timeLabel, roomLabel, topics: ["AI: Agents"] };
}
