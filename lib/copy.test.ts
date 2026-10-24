import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";

test("UI copy has no em or en dashes", () => {
  const files = walk(path.join(process.cwd(), "app")).concat(walk(path.join(process.cwd(), "components")));
  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("\u2014") || text.includes("\u2013")) hits.push(file);
  }
  assert.deepEqual(hits, []);
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(full);
  }
  return out;
}
