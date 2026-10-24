import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { recommend } from "./graph";
import { liveCounts } from "./seed-graph";

test("health counts and recommend do not write the graph", async () => {
  const previous = process.env.FALKORDB_URL;
  delete process.env.FALKORDB_URL;
  try {
    const report = await liveCounts();
    assert.equal(report.backend, "memory");
    assert.ok(report.nodes > 0);
    const ranked = await recommend({ day: "both", metIds: [], limit: 3 });
    assert.equal(ranked.backend, "memory");
    assert.equal(ranked.people.length, 3);
    assert.ok(ranked.people.some((person) => person.id === "john-maeda") || ranked.people.length === 3);
  } finally {
    if (previous === undefined) delete process.env.FALKORDB_URL;
    else process.env.FALKORDB_URL = previous;
  }

  const graph = read("lib/graph.ts");
  assert.equal(graph.includes("ensureCatalog"), false);
  assert.equal(graph.includes("ensureCypher"), false);
  assert.equal(graph.includes("scheduleCypher"), false);

  const seed = read("lib/seed-graph.ts");
  const liveStart = seed.indexOf("export async function liveCounts");
  const liveEnd = seed.indexOf("function memoryStatus");
  const live = seed.slice(liveStart, liveEnd);
  assert.equal(live.includes("ensureCypher"), false);
  assert.equal(live.includes("ensureCatalog"), false);
  assert.equal(live.includes(".query("), false);

  const health = read("app/api/health/route.ts");
  assert.equal(health.includes("ensureCypher"), false);
  assert.equal(health.includes("ensureCatalog"), false);
  assert.match(health, /liveCounts/);

  const seedRoute = read("app/api/seed/route.ts");
  assert.match(seedRoute, /ensureCypher/);
  assert.match(seedRoute, /SEED_TOKEN/);
});

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}
