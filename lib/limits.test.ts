import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit, resetLimits } from "./limits";

test("rate limit blocks the next call after the cap", () => {
  resetLimits();
  assert.equal(rateLimit("t", 2, 60_000).ok, true);
  assert.equal(rateLimit("t", 2, 60_000).ok, true);
  const blocked = rateLimit("t", 2, 60_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(rateLimit("other", 2, 60_000).ok, true);
});
