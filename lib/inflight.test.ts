import assert from "node:assert/strict";
import { test } from "node:test";
import { shareInflight } from "./inflight";

test("shareInflight runs once until the call settles", async () => {
  let runs = 0;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = shareInflight("once", async () => {
    runs += 1;
    await gate;
    return "ok";
  });
  const second = shareInflight("once", async () => {
    runs += 1;
    return "other";
  });
  assert.equal(first, second);
  release();
  assert.equal(await first, "ok");
  assert.equal(await second, "ok");
  assert.equal(runs, 1);
  assert.equal(
    await shareInflight("once", async () => {
      runs += 1;
      return "next";
    }),
    "next",
  );
  assert.equal(runs, 2);
});

test("a failed shared call can be tried again", async () => {
  await assert.rejects(
    shareInflight("retry", async () => {
      throw new Error("nope");
    }),
  );
  assert.equal(await shareInflight("retry", async () => "recovered"), "recovered");
});
