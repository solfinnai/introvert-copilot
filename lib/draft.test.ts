import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attachChannels,
  deliverShare,
  isEmail,
  isLinkedInUrl,
  linkedinNoteFromBody,
  mailtoHref,
  shareData,
  type FollowupDraft,
} from "./draft";

const draft: FollowupDraft = {
  subject: "After your session",
  body: "Hi Mario. I caught your session at GitHub Universe. I run Unicorn Studios and make films for tech companies. Would a short example be useful? Henry Finn",
  linkedinNote: "",
  linkedinUrl: null,
  email: null,
};

test("mailto leaves the recipient empty unless the graph has an email", () => {
  const blank = mailtoHref(draft);
  assert.equal(blank.startsWith("mailto:?subject="), true);
  assert.equal(blank.includes("@"), false);
  const withEmail = mailtoHref({ ...draft, email: "mario@github.com" });
  assert.equal(withEmail.startsWith("mailto:mario@github.com?"), true);
  assert.equal(mailtoHref({ ...draft, email: "not an email" }).startsWith("mailto:?"), true);
  assert.equal(isEmail("henry@0n1force.com"), true);
  assert.equal(isEmail("henry"), false);
});

test("linkedin profile urls are https linkedin.com/in links only", () => {
  assert.equal(isLinkedInUrl("https://www.linkedin.com/in/mariorodriguez3/"), true);
  assert.equal(isLinkedInUrl("https://linkedin.com/in/henryfinnco"), true);
  assert.equal(isLinkedInUrl("https://uk.linkedin.com/in/kevinbackhouse"), true);
  assert.equal(isLinkedInUrl("https://linkedin.com.evil.example/in/kevinbackhouse"), false);
  assert.equal(isLinkedInUrl("http://www.linkedin.com/in/mariorodriguez3"), false);
  assert.equal(isLinkedInUrl("https://evil.example/in/mariorodriguez3"), false);
  assert.equal(isLinkedInUrl(""), false);
  const attached = attachChannels(draft, {
    email: "nope",
    linkedinUrl: "https://www.linkedin.com/in/mariorodriguez3/",
  });
  assert.equal(attached?.email, null);
  assert.equal(attached?.linkedinUrl, "https://www.linkedin.com/in/mariorodriguez3/");
  assert.ok((attached?.linkedinNote.length ?? 0) > 20);
  assert.ok((attached?.linkedinNote.length ?? 999) <= 280);
});

test("send anywhere shares the draft text and copies when share is missing", async () => {
  const payload = shareData(draft);
  assert.match(payload.text, /After your session/);
  assert.match(payload.text, /Unicorn Studios/);
  let shared = "";
  const opened = await deliverShare(draft, {
    share: async (data) => {
      shared = data.text;
    },
    copy: async () => {
      throw new Error("copy should not run");
    },
  });
  assert.equal(opened, "shared");
  assert.equal(shared, payload.text);

  const cancelled = await deliverShare(draft, {
    share: async () => {
      const err = new Error("abort");
      err.name = "AbortError";
      throw err;
    },
    copy: async () => {
      throw new Error("copy should not run");
    },
  });
  assert.equal(cancelled, "cancelled");

  let copied = "";
  const fallback = await deliverShare(draft, {
    copy: async (text) => {
      copied = text;
      return true;
    },
  });
  assert.equal(fallback, "copied");
  assert.equal(copied, payload.text);

  const denied = await deliverShare(draft, {
    share: async () => {
      throw new Error("share unavailable");
    },
    copy: async (text) => {
      copied = `desk:${text}`;
      return true;
    },
  });
  assert.equal(denied, "copied");
  assert.match(copied, /^desk:/);
});

test("linkedin note is a short clip with no em dash", () => {
  const note = linkedinNoteFromBody(`${"word ".repeat(120)}end`);
  assert.ok(note.length <= 280);
  assert.equal(note.endsWith("..."), true);
  assert.equal(note.includes("\u2014"), false);
  assert.equal(note.includes("\u2013"), false);
});
