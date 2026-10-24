import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeDailyBudget, dailyBudgetLimit, peekDailyBudget, resetDailyBudget } from "./budget";

test("daily budget blocks the next call and resets on the next UTC day", () => {
  resetDailyBudget();
  const day = new Date("2026-10-24T18:00:00Z");
  assert.equal(consumeDailyBudget(day, 2).ok, true);
  assert.equal(consumeDailyBudget(day, 2).ok, true);
  const blocked = consumeDailyBudget(day, 2);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.used, 2);
  assert.equal(peekDailyBudget(day, 2).remaining, 0);
  const next = consumeDailyBudget(new Date("2026-10-25T00:05:00Z"), 2);
  assert.equal(next.ok, true);
  assert.equal(next.used, 1);
  assert.equal(next.remaining, 1);
});

test("daily budget defaults to 800 and ignores blank or junk env values", () => {
  assert.equal(dailyBudgetLimit(undefined), 800);
  assert.equal(dailyBudgetLimit(""), 800);
  assert.equal(dailyBudgetLimit("nope"), 800);
  assert.equal(dailyBudgetLimit("0"), 800);
  assert.equal(dailyBudgetLimit("40"), 40);
  assert.equal(dailyBudgetLimit("800.9"), 800);
});
