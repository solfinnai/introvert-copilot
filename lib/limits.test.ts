import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { bucketCount, meetLimitKey, pruneExpired, rateLimit, resetLimits } from "./limits";

test("rate limit blocks the next call after the cap", () => {
  resetLimits();
  assert.equal(rateLimit("t", 2, 60_000).ok, true);
  assert.equal(rateLimit("t", 2, 60_000).ok, true);
  const blocked = rateLimit("t", 2, 60_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(rateLimit("other", 2, 60_000).ok, true);
});

test("meet limit key is the client IP and not a cookie", () => {
  assert.equal(meetLimitKey("203.0.113.8"), "meet:203.0.113.8");
  assert.equal(meetLimitKey("203.0.113.8").includes("sid"), false);
  const route = fs.readFileSync(path.join(process.cwd(), "app/api/meet/route.ts"), "utf8");
  assert.equal(route.includes("meetLimitKey(clientIp(req))"), true);
  assert.equal(route.includes("cookies("), false);
});

test("expired rate limit buckets are pruned", () => {
  resetLimits();
  rateLimit("live", 5, 10_000, 1_000);
  for (let i = 0; i < 127; i += 1) rateLimit(`old-${i}`, 5, 1_000, 1_000);
  assert.equal(bucketCount(), 128);
  const removed = pruneExpired(2_000);
  assert.equal(removed, 127);
  assert.equal(bucketCount(), 1);
  rateLimit("fresh", 5, 1_000, 2_000);
  assert.equal(bucketCount(), 2);
  assert.equal(rateLimit("live", 5, 10_000, 2_000).ok, true);
  resetLimits();
  for (let i = 0; i < 128; i += 1) rateLimit(`aged-${i}`, 5, 1_000, 5_000);
  rateLimit("next", 5, 1_000, 6_000);
  assert.equal(bucketCount(), 1);
});
