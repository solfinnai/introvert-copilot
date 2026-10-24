import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import { curatedById } from "./curated";
import {
  applyLiveSources,
  buildSnapshotIntel,
  describeFetches,
  extractSchools,
  modeLabel,
  normalizeLinkedIn,
  parseLinkedInPayload,
  parsePage,
  parseSerp,
  pickUnlockTargets,
  type SnapshotInput,
} from "./intel";

test("serp json keeps public results and drops LinkedIn and Google", () => {
  const hits = parseSerp(
    JSON.stringify({
      organic: [
        { link: "https://www.linkedin.com/in/johnmaeda", title: "John Maeda", description: "Profile" },
        { link: "https://www.google.com/search?q=john", title: "Search", description: "Google" },
        {
          link: "https://johnmaeda.medium.com/design-in-tech",
          title: "Design in Tech",
          description: "From UX to AX",
        },
      ],
      news: [{ link: "https://www.wired.com/story/maeda", title: "Wired", description: "A profile", date: "Mar 2026" }],
    }),
  );
  assert.deepEqual(
    hits.map((hit) => hit.url),
    ["https://johnmaeda.medium.com/design-in-tech", "https://www.wired.com/story/maeda"],
  );
  assert.equal(hits[1].kind, "news");
  assert.equal(hits[1].date, "Mar 2026");
});

test("serp html fallback reads result links and skips LinkedIn", () => {
  const html = `
    <a href="/url?q=https://maggieappleton.com/planning-agents&amp;sa=U">Planning with agents</a>
    <a href="https://www.linkedin.com/in/maggieappleton/">Maggie Appleton</a>
    <a href="https://www.google.com/preferences">Settings</a>
  `;
  const hits = parseSerp(html);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].url, "https://maggieappleton.com/planning-agents");
  assert.match(hits[0].title, /Planning with agents/);
});

test("page parser strips tags and keeps the title", () => {
  const page = parsePage("<html><title>Studio</title><style>p{}</style><p>Hello there friend.</p></html>", "https://example.com");
  assert.equal(page.title, "Studio");
  assert.match(page.excerpt, /Hello there friend/);
  assert.equal(page.excerpt.includes("<p>"), false);
});

test("Henry LinkedIn snapshot has company and site, and empty history", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "data", "demo", "henry-linkedin.json"), "utf8");
  const profile = parseLinkedInPayload(raw);
  assert.ok(profile);
  assert.equal(profile?.company, "Unicorn Studios");
  assert.equal(profile?.experienceGap, true);
  assert.equal(profile?.educationGap, true);
  assert.equal(profile?.experience.length, 0);
  assert.equal(profile?.education.length, 0);
  assert.match(profile?.about ?? "", /entertainment companies/i);
  assert.equal(profile?.url, "https://www.linkedin.com/in/henryfinnco");
  assert.equal(JSON.stringify(profile).includes("Salesforce"), false);
});

test("LinkedIn positions are read, and a pending snapshot is not a profile", () => {
  const profile = parseLinkedInPayload(
    JSON.stringify({
      name: "Ada Lovelace",
      input_url: "https://www.linkedin.com/in/ada/",
      experience: [{ company: "Analytical Engines", positions: [{ title: "Programmer", start_date: "1843", end_date: "Present" }] }],
      education: [{ title: "University of London", degree: "Mathematics" }],
    }),
  );
  assert.equal(profile?.experience[0]?.title, "Programmer");
  assert.equal(profile?.experience[0]?.company, "Analytical Engines");
  assert.match(profile?.experience[0]?.when ?? "", /1843 to Present/);
  assert.equal(profile?.education[0]?.school, "University of London");
  assert.equal(parseLinkedInPayload(JSON.stringify({ snapshot_id: "abc" })), null);
});

test("John Maeda snapshot names schools, stays cached, and cites a source", () => {
  const intel = buildSnapshotIntel(maedaInput());
  assert.equal(intel.mode, "snapshot");
  assert.equal(intel.label, "Cached snapshot");
  assert.equal(modeLabel("snapshot"), "Cached snapshot");
  assert.ok(intel.education.some((claim) => /MIT Media Lab/.test(claim.text)));
  assert.ok(intel.education.some((claim) => /Rhode Island School of Design/.test(claim.text)));
  assert.ok(intel.news.some((claim) => /Design in Tech/.test(claim.text)));
  for (const claim of [...intel.work, ...intel.education, ...intel.news, ...intel.standout, ...intel.talkingPoints]) {
    assert.match(claim.sourceUrl, /^https?:\/\//);
    assert.ok(claim.fetchedAt);
    assert.equal(claim.text.includes("\u2014"), false);
    assert.equal(claim.text.includes("\u2013"), false);
    assert.equal(claim.origin, "snapshot");
  }
  assert.match(intel.personality.label, /Not a diagnosis/);
});

test("empty live pieces stay on the cached snapshot", () => {
  const snapshot = buildSnapshotIntel(maedaInput());
  const same = applyLiveSources(snapshot, { fetchedAt: "2026-10-24T20:00:00.000Z", linkedin: null, serp: [], pages: [] }, maedaInput());
  assert.equal(same, snapshot);
  assert.equal(same.label, "Cached snapshot");
});

test("a live LinkedIn gap does not invent experience and keeps the conference bio", () => {
  const input = maedaInput();
  const snapshot = buildSnapshotIntel(input);
  const profile = parseLinkedInPayload(
    fs.readFileSync(path.join(process.cwd(), "data", "demo", "henry-linkedin.json"), "utf8"),
  );
  assert.ok(profile);
  const intel = applyLiveSources(
    snapshot,
    { fetchedAt: "2026-10-24T20:40:00.000Z", linkedin: profile, serp: [], pages: [] },
    input,
  );
  assert.equal(intel.mode, "live");
  assert.equal(intel.label, "Live public web");
  assert.match(intel.workGap ?? "", /no experience/i);
  assert.match(intel.educationGap ?? "", /no education/i);
  assert.equal(intel.work.some((claim) => /Salesforce/.test(claim.text)), false);
  assert.ok(intel.work.some((claim) => claim.origin === "live" && /Unicorn Studios/.test(claim.text)));
  assert.ok(intel.education.some((claim) => claim.origin === "snapshot" && /Media Lab/.test(claim.text)));
  const liveClaim = intel.work.find((claim) => claim.origin === "live");
  assert.equal(liveClaim?.fetchedAt, "2026-10-24T20:40:00.000Z");
  assert.match(liveClaim?.sourceUrl ?? "", /linkedin\.com\/in\/henryfinnco/);
});

test("unlock targets prefer a personal site and skip LinkedIn", () => {
  const urls = pickUnlockTargets(
    [
      { url: "https://www.linkedin.com/in/maggieappleton/", title: "LinkedIn", snippet: "", kind: "organic", date: "" },
      { url: "https://github.com/blog", title: "GitHub", snippet: "", kind: "organic", date: "" },
      { url: "https://maggieappleton.com/now", title: "Now", snippet: "", kind: "organic", date: "" },
    ],
    "Maggie Appleton",
    2,
  );
  assert.deepEqual(urls, ["https://maggieappleton.com/now", "https://github.com/blog"]);
});

test("snapshot fetch wording does not claim a live result", () => {
  const line = describeFetches(
    {
      serp: "failed",
      unlock: "failed",
      linkedin: "skipped",
      plan: "template",
      serpReason: "not configured",
      unlockReason: "not requested",
      linkedinReason: "no public url",
    },
    "snapshot",
  );
  assert.match(line, /Cached snapshot/);
  assert.equal(/\blive\b/i.test(line), false);
});

test("school extractor and linkedin normalizer", () => {
  assert.deepEqual(extractSchools("Studied at the MIT Media Lab and the Rhode Island School of Design."), [
    "MIT Media Lab",
    "Rhode Island School of Design",
  ]);
  assert.equal(normalizeLinkedIn("https://linkedin.com/in/JohnMaeda/"), "https://www.linkedin.com/in/JohnMaeda");
  assert.equal(normalizeLinkedIn("not a url"), null);
});

function maedaInput(): SnapshotInput {
  const catalog = getCatalog();
  const person = catalog.peopleById.get("john-maeda");
  assert.ok(person);
  const curated = curatedById("john-maeda");
  const session = person.sessionIds
    .map((id) => catalog.sessionsById.get(id))
    .find((item) => item && !item.skip);
  return {
    name: person.name,
    title: person.title,
    company: person.company,
    bio: person.bio,
    sessionTitle: session?.title ?? null,
    sessionAbstract: session?.abstract ?? "",
    topics: [...(session?.topics ?? []), ...(curated?.topics ?? [])],
    sources: (curated?.sources ?? []).map((source) => ({
      url: source.url || "",
      title: source.title || "",
      date: source.date,
    })),
    catalogUrl: catalog.catalogUrl,
    fetchedAt: curated?.fetched_at || catalog.fetchedAt,
    linkedinUrl: person.linkedinUrl,
  };
}
