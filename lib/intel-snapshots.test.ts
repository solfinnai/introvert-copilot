import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { INTEL_CACHE_TTL_MS, readBriefCache, readIntelSnapshot, resetBriefCacheForTests, writeBriefCache } from "./intel-cache";
import { savedIntelLine, setIntelSnapshotDirForTests } from "./intel-snapshots";
import { MET_CONFIRMATION } from "./saved";

const fixtureDir = path.join(process.cwd(), "test/fixtures/intel-snapshots");

test("saved intel line is a Pacific calendar date", () => {
  assert.equal(savedIntelLine("2020-01-15T18:00:00.000Z"), "Saved intel, Jan 15, 2020");
  assert.equal(savedIntelLine("not-a-date"), "Saved intel");
  assert.equal(MET_CONFIRMATION, "Marked as met. They will drop off your list.");
});

test("a committed snapshot is used when memory and the graph have nothing, and it does not expire", async () => {
  const previous = process.env.FALKORDB_URL;
  delete process.env.FALKORDB_URL;
  resetBriefCacheForTests();
  setIntelSnapshotDirForTests(fixtureDir);
  try {
    const ada = await readBriefCache("fixture-ada");
    const grace = await readBriefCache("fixture-grace");
    assert.ok(ada);
    assert.ok(grace);
    assert.equal(ada.plan.why, "Ada fixture why.");
    assert.equal(grace.plan.why, "Grace fixture why.");
    assert.equal(ada.intel.mode, "cache");
    assert.equal(ada.profiles[0]?.platform, "linkedin");
    assert.equal(ada.links[0]?.url, "https://example.com/story");
    assert.ok(Date.now() - Date.parse(ada.savedAt) > INTEL_CACHE_TTL_MS);
    const again = await readBriefCache("fixture-ada");
    assert.equal(again?.plan.why, "Ada fixture why.");
  } finally {
    resetBriefCacheForTests();
    setIntelSnapshotDirForTests(null);
    if (previous === undefined) delete process.env.FALKORDB_URL;
    else process.env.FALKORDB_URL = previous;
  }
});

test("a snapshot file without a version field still loads", async () => {
  const previous = process.env.FALKORDB_URL;
  delete process.env.FALKORDB_URL;
  resetBriefCacheForTests();
  const dir = fs.mkdtempSync(path.join(process.cwd(), "test/fixtures/intel-snapshots-"));
  try {
    const ada = JSON.parse(fs.readFileSync(path.join(fixtureDir, "fixture-ada.json"), "utf8")) as { version?: number };
    delete ada.version;
    fs.writeFileSync(path.join(dir, "fixture-ada.json"), JSON.stringify(ada));
    setIntelSnapshotDirForTests(dir);
    const brief = await readBriefCache("fixture-ada");
    assert.equal(brief?.version, 5);
    assert.equal(brief?.plan.why, "Ada fixture why.");
  } finally {
    resetBriefCacheForTests();
    setIntelSnapshotDirForTests(null);
    fs.rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.FALKORDB_URL;
    else process.env.FALKORDB_URL = previous;
  }
});

test("a missing snapshot stays a miss, and a fresh memory brief wins", async () => {
  const previous = process.env.FALKORDB_URL;
  delete process.env.FALKORDB_URL;
  resetBriefCacheForTests();
  setIntelSnapshotDirForTests(fixtureDir);
  try {
    assert.equal(await readBriefCache("fixture-missing"), null);
    assert.equal(readIntelSnapshot("fixture-missing"), null);
    assert.equal(readIntelSnapshot("../package"), null);
    assert.equal(readIntelSnapshot("Not A Person"), null);

    const file = await readBriefCache("fixture-ada");
    assert.ok(file);
    const expired = {
      ...file,
      savedAt: "2020-01-01T00:00:00.000Z",
      plan: { ...file.plan, why: "Expired memory." },
    };
    await writeBriefCache("fixture-ada", expired);
    const fromFile = await readBriefCache("fixture-ada");
    assert.equal(fromFile?.plan.why, "Ada fixture why.");

    resetBriefCacheForTests();
    const fresh = {
      ...file,
      savedAt: new Date().toISOString(),
      plan: { ...file.plan, why: "Memory why." },
    };
    await writeBriefCache("fixture-ada", fresh);
    const fromMemory = await readBriefCache("fixture-ada");
    assert.equal(fromMemory?.plan.why, "Memory why.");
  } finally {
    resetBriefCacheForTests();
    setIntelSnapshotDirForTests(null);
    if (previous === undefined) delete process.env.FALKORDB_URL;
    else process.env.FALKORDB_URL = previous;
  }
});

test("the person page paints a snapshot and leaves live intel for people without one", () => {
  const root = process.cwd();
  const page = fs.readFileSync(path.join(root, "app/people/[id]/page.tsx"), "utf8");
  const live = fs.readFileSync(path.join(root, "components/PersonLive.tsx"), "utf8");
  const meet = fs.readFileSync(path.join(root, "app/meet/page.tsx"), "utf8");
  const home = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const speakers = fs.readFileSync(path.join(root, "app/speakers/page.tsx"), "utf8");
  assert.match(page, /readIntelSnapshot/);
  assert.match(page, /buildSeedBrief/);
  assert.equal(page.includes("loadPersonBrief"), false);
  assert.equal(page.includes("describePerson"), false);
  assert.equal(fs.existsSync(path.join(root, "app/people/[id]/loading.tsx")), false);
  assert.equal((live.match(/if \(settled\) return/g) ?? []).length, 2);
  assert.match(live, /data-seed=\{settled \? "snapshot" : "live"\}/);
  assert.match(meet, /recommendFromMemory/);
  assert.equal(meet.includes("await recommend("), false);
  assert.match(home, /rankPeople/);
  assert.equal(home.includes("await "), false);
  assert.match(speakers, /directoryFromCatalog/);
  assert.equal(fs.existsSync(path.join(root, "data/intel-snapshots/john-maeda.json")), true);
  setIntelSnapshotDirForTests(null);
  const john = readIntelSnapshot("john-maeda");
  assert.ok(john);
  assert.equal(john.plan.why.length > 0, true);
  assert.equal(readIntelSnapshot("kent-c-dodds"), null);
});
