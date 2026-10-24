import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getCatalog } from "./catalog";
import {
  discoveryLabel,
  explainMatch,
  humanEdgeLabel,
  humanNoteLabel,
  visibleIntroPath,
  visiblePath,
} from "./path-explain";
import { rankPeople } from "./rank";
import type { PathChip } from "./types";

test("john maeda reads as two plain sentences from the same path", () => {
  const maeda = rankPeople(getCatalog(), null, { day: "both", metIds: [], limit: 10 }).find(
    (person) => person.id === "john-maeda",
  );
  assert.ok(maeda);
  const text = explainMatch({
    name: maeda.name,
    sessionTitle: maeda.sessionTitle,
    path: maeda.path,
    introName: maeda.introVia?.name ?? null,
    keywordHits: maeda.keywordHits,
  });
  assert.equal(
    text,
    "You like open source. John's talk, Sketching with code in the age of AI, is about it, and Qianqian Ye is on John's panel and could introduce you.",
  );
  assert.equal(sentenceCount(text), 2);
  assert.equal(text.includes("INTERESTED_IN"), false);
  assert.equal(text.includes("hops"), false);
  assert.equal(text.includes("Bio hits"), false);
  assert.equal(/[\u2013\u2014]/.test(text), false);

  assert.deepEqual(
    visiblePath(maeda.path, maeda.sessionTitle).map((chip) => chip.text),
    [
      "You",
      "You like",
      "Open source",
      "Talk about",
      "Sketching with code in the age of AI",
      "Presented by",
      "John Maeda",
    ],
  );
  assert.deepEqual(
    visibleIntroPath(maeda.introPath).map((chip) => chip.text),
    ["Qianqian Ye", "Also on the panel", "John Maeda"],
  );
});

test("explanation uses the full talk title and phrases stiff topic names", () => {
  const text = explainMatch({
    name: "Pierre Tempel",
    sessionTitle: "Agentic security for every developer",
    path: [
      { kind: "node", text: "You" },
      { kind: "edge", text: "INTERESTED_IN" },
      { kind: "node", text: "AI: Agents" },
      { kind: "edge", text: "ABOUT" },
      { kind: "node", text: "Agentic security..." },
      { kind: "edge", text: "PRESENTS" },
      { kind: "node", text: "Pierre Tempel" },
    ],
    introName: null,
    keywordHits: ["design", "ai"],
  });
  assert.equal(
    text,
    "You like AI agents. Pierre's talk, Agentic security for every developer, is about it.",
  );
  assert.equal(text.includes("Bio hits"), false);

  const dx = explainMatch({
    name: "Said Nikjou",
    sessionTitle: "Building a developer knowledge base for GitHub Copilot",
    path: interestPath("Developer experience (DX)", "Said Nikjou"),
    introName: null,
    keywordHits: [],
  });
  assert.match(dx, /^You like developer experience \(DX\)\./);
});

test("a keyword match stays in plain english and the chips read left to right", () => {
  const path: PathChip[] = [
    { kind: "note", text: "Keyword match: design", tone: "plain" },
    { kind: "node", text: "John Maeda", tone: "solid" },
    { kind: "edge", text: "PRESENTS", tone: "plain" },
    { kind: "node", text: "Sketching with code...", tone: "plain" },
  ];
  const text = explainMatch({
    name: "John Maeda",
    sessionTitle: "Sketching with code in the age of AI",
    path,
    introName: "Qianqian Ye",
    keywordHits: ["design", "media", "ai"],
  });
  assert.equal(
    text,
    "John's public bio mentions design, media and AI. John is presenting Sketching with code in the age of AI, and Qianqian Ye is on John's panel and could introduce you.",
  );
  assert.equal(sentenceCount(text), 2);
  assert.deepEqual(
    visiblePath(path, "Sketching with code in the age of AI").map((chip) => chip.text),
    [
      "Public bio mentions design",
      "Sketching with code...",
      "Presented by",
      "John Maeda",
    ],
  );
  assert.equal(humanNoteLabel("Keyword match"), "Public bio mention");
});

test("a dashed talk title is punctuated without an em dash", () => {
  const text = explainMatch({
    name: "John Maeda",
    sessionTitle: "From UX \u2014 to AX",
    path: interestPath("Open source", "John Maeda"),
    introName: null,
    keywordHits: [],
  });
  assert.equal(text.includes("\u2014"), false);
  assert.equal(text.includes("\u2013"), false);
  assert.match(text, /From UX, to AX/);
});

test("human labels cover the relationship names on the path", () => {
  assert.equal(humanEdgeLabel("INTERESTED_IN"), "You like");
  assert.equal(humanEdgeLabel("ABOUT"), "Talk about");
  assert.equal(humanEdgeLabel("PRESENTS"), "Presented by");
  assert.equal(humanEdgeLabel("CO_PRESENTS"), "Also on the panel");
  assert.equal(humanEdgeLabel("DESCRIBES"), "describes");
});

test("falkordb stays named, and a memory answer does not claim the database ran", () => {
  assert.deepEqual(discoveryLabel("falkordb"), {
    found: "Found with FalkorDB",
    toggle: "How FalkorDB found this",
  });
  assert.equal(discoveryLabel("memory").found, "Found with the in-memory graph");
  assert.equal(discoveryLabel("memory").toggle, "How FalkorDB found this");
});

test("the graph panel leads with the explanation and hides the query", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "GraphPath.tsx"), "utf8");
  const board = fs.readFileSync(path.join(process.cwd(), "components", "MeetBoard.tsx"), "utf8");
  const detailsAt = source.indexOf("<details");
  const detailsEnd = source.indexOf("</details>");
  assert.ok(detailsAt > 0 && detailsEnd > detailsAt);
  const before = source.slice(0, detailsAt);
  const inside = source.slice(detailsAt, detailsEnd);
  assert.match(before, /explainMatch\(/);
  assert.match(before, /visiblePath\(/);
  assert.match(before, /labels\.found/);
  assert.equal(before.includes("Copy query"), false);
  assert.equal(before.includes("Bio hits"), false);
  assert.equal(before.includes("{hops}"), false);
  assert.equal(before.toLowerCase().includes("intro via"), false);
  assert.match(inside, /labels\.toggle/);
  assert.match(inside, /Copy query/);
  assert.match(inside, /Bio hits/);
  assert.match(inside, /\{hops\}/);
  assert.match(inside, /\{cypher\}/);
  const tag = source.slice(detailsAt, source.indexOf(">", detailsAt));
  assert.equal(/\sopen(\s|=|$)/.test(tag), false);
  assert.equal(source.includes("\u2014"), false);
  assert.equal(source.includes("\u2013"), false);
  assert.equal(board.includes("} hops"), false);
  assert.equal(board.includes("Bio hits"), false);
});

function sentenceCount(text: string): number {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
}

function interestPath(topic: string, name: string): PathChip[] {
  return [
    { kind: "node", text: "You", tone: "solid" },
    { kind: "edge", text: "INTERESTED_IN", tone: "plain" },
    { kind: "node", text: topic, tone: "plain" },
    { kind: "edge", text: "ABOUT", tone: "plain" },
    { kind: "node", text: "A talk", tone: "plain" },
    { kind: "edge", text: "PRESENTS", tone: "plain" },
    { kind: "node", text: name, tone: "solid" },
  ];
}
