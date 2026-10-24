import assert from "node:assert/strict";
import { test } from "node:test";
import { accumulateMet, isLatestRequest, nextRequestId } from "./latest-request";

test("only the latest meet request may update the list", () => {
  let latest = 0;
  const first = (latest = nextRequestId(latest));
  const second = (latest = nextRequestId(latest));
  assert.equal(isLatestRequest(latest, first), false);
  assert.equal(isLatestRequest(latest, second), true);
});

test("met ids accumulate in click order", () => {
  const once = accumulateMet([], "ada");
  const twice = accumulateMet(once, "grace");
  const repeat = accumulateMet(twice, "ada");
  assert.deepEqual(twice, ["ada", "grace"]);
  assert.deepEqual(repeat, ["ada", "grace"]);
});
