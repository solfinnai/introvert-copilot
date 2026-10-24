import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_NEXT_STEP,
  NOTE_MAX,
  SAVED_CAP,
  parseDemoState,
  toggleSaved,
  updateSaved,
  type DemoState,
} from "./saved";

const mario = {
  id: "mario-rodriguez",
  name: "Mario Rodriguez",
  titleLine: "Chief Product Officer, GitHub",
  photoUrl: "/photos/mario.jpg",
  opener: "Your session is why I came over.",
  catchLine: "Main Stage, Wed 11:15 AM",
};

test("saved store adds, updates, and removes a person", () => {
  let state: DemoState = { saved: [], met: [] };
  state = toggleSaved(state, mario);
  assert.equal(state.saved.length, 1);
  assert.equal(state.saved[0]?.nextStep, DEFAULT_NEXT_STEP);
  assert.equal(state.saved[0]?.note, "");
  state = updateSaved(state, mario.id, { note: "Ask about agents after the talk", nextStep: "Say hello after the session" });
  assert.equal(state.saved[0]?.note, "Ask about agents after the talk");
  assert.equal(state.saved[0]?.nextStep, "Say hello after the session");
  state = toggleSaved(state, mario);
  assert.deepEqual(state.saved, []);
});

test("saved store clamps notes, drops unknown next steps, and caps the list", () => {
  let state: DemoState = { saved: [], met: ["keep-me"] };
  state = toggleSaved(state, mario);
  state = updateSaved(state, mario.id, { note: "n".repeat(NOTE_MAX + 40), nextStep: "send them a gift" });
  assert.equal(state.saved[0]?.note.length, NOTE_MAX);
  assert.equal(state.saved[0]?.nextStep, DEFAULT_NEXT_STEP);
  for (let i = 0; i < SAVED_CAP + 3; i += 1) {
    state = toggleSaved(state, { ...mario, id: `person-${i}`, name: `Person ${i}` });
  }
  assert.equal(state.saved.length, SAVED_CAP);
  assert.equal(state.saved[0]?.id, "mario-rodriguez");
  assert.equal(state.saved[0]?.note.length, NOTE_MAX);
  assert.equal(state.saved.at(-1)?.id, `person-${SAVED_CAP - 2}`);
  assert.equal(state.saved.some((person) => person.id === `person-${SAVED_CAP - 1}`), false);
  assert.deepEqual(state.met, ["keep-me"]);
});

test("saved store ignores junk and keeps older notes", () => {
  const raw = JSON.stringify({
    saved: [
      { id: "bad id", name: "Nope" },
      { id: "angie-jones", name: "Angie Jones", note: "Sit near the back", nextStep: "Ask about their talk" },
      { id: "kept-person", name: "Kept Person", note: 12, nextStep: { bad: true } },
      "nope",
    ],
    met: ["angie-jones", 4, ""],
  });
  const state = parseDemoState(raw);
  assert.equal(state.saved.length, 2);
  assert.equal(state.saved[0]?.name, "Angie Jones");
  assert.equal(state.saved[0]?.note, "Sit near the back");
  assert.equal(state.saved[1]?.note, "");
  assert.equal(state.saved[1]?.nextStep, DEFAULT_NEXT_STEP);
  assert.deepEqual(state.met, ["angie-jones"]);
  assert.deepEqual(parseDemoState("not json"), { saved: [], met: [] });
  assert.deepEqual(parseDemoState(null), { saved: [], met: [] });
});
