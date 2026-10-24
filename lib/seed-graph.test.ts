import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldCacheSeed, unwind, writeSeedMarker } from "./seed-graph";

test("the seed marker is written only when every row succeeded", async () => {
  const queries: string[] = [];
  const graph = {
    async query(statement: string) {
      queries.push(statement);
      return { data: [] };
    },
  };
  assert.equal(await writeSeedMarker(graph, "catalog", 1, 2), false);
  assert.equal(queries.length, 0);
  assert.equal(await writeSeedMarker(graph, "catalog", 1, 0), true);
  assert.match(queries[0], /s\.catalog/);
  assert.equal(queries[0].includes("s.cypher"), false);
});

test("unwind counts rows that still fail and ignores a recovered batch", async () => {
  const calls: number[] = [];
  const graph = {
    async query(_statement: string, options?: { params?: { rows?: { id: string }[] } }) {
      const rows = options?.params?.rows ?? [];
      calls.push(rows.length);
      if (rows.length > 1) throw new Error("batch rejected");
      if (rows[0]?.id === "bad") throw new Error("row rejected");
      return { data: [] };
    },
  };
  const failed = await unwind(
    graph,
    "UNWIND $rows AS row RETURN row",
    [{ id: "ok" }, { id: "bad" }],
    10,
  );
  assert.equal(failed, 1);
  assert.deepEqual(calls, [2, 1, 1]);

  const healthy = {
    async query() {
      return { data: [] };
    },
  };
  assert.equal(await unwind(healthy, "Q", [{ id: "a" }, { id: "b" }], 10), 0);
});

test("an unfinished database seed is not cached", () => {
  assert.equal(shouldCacheSeed(true, "memory"), false);
  assert.equal(shouldCacheSeed(true, "falkordb"), true);
  assert.equal(shouldCacheSeed(false, "memory"), true);
});
