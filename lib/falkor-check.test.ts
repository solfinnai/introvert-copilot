import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";

test("connectivity check deletes only a uniquely named temp graph", () => {
  const file = path.join(process.cwd(), "scripts", "falkor_check.py");
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /def temp_graph_name\(/);
  assert.match(source, /ic_check_/);
  assert.match(source, /graph\.delete\(\)/);
  assert.equal(source.includes("select_graph(\"conference\")"), false);
  assert.equal(source.includes("select_graph('conference')"), false);
  assert.equal(source.includes("\"conference\""), false);
  assert.equal(source.includes("'conference'"), false);
  assert.match(source, /finally:/);
});
