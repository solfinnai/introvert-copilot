import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFalkorUrl } from "./falkor-url";
import { redact } from "./redact";
import { splitCypher } from "./seed-graph";
import fs from "fs";
import path from "path";

test("falkors URL is TLS and keeps a non-standard port", () => {
  const endpoint = parseFalkorUrl("falkors://default:p%40ss@db.example:61234");
  assert.equal(endpoint.tls, true);
  assert.equal(endpoint.username, "default");
  assert.equal(endpoint.password, "p@ss");
  assert.equal(endpoint.host, "db.example");
  assert.equal(endpoint.port, 61234);
});

test("falkor URL is plain TCP", () => {
  const endpoint = parseFalkorUrl("falkor://localhost:6379");
  assert.equal(endpoint.tls, false);
  assert.equal(endpoint.host, "localhost");
  assert.equal(endpoint.port, 6379);
  assert.equal(endpoint.username, "");
});

test("rediss and redis schemes map the same way", () => {
  assert.equal(parseFalkorUrl("rediss://u:pw@host.example:443").tls, true);
  assert.equal(parseFalkorUrl("redis://localhost:6379").tls, false);
});

test("missing scheme is rejected", () => {
  assert.throws(() => parseFalkorUrl("localhost:6379"), /scheme/);
});

test("redact strips connection URLs", () => {
  const leaked = "failed falkors://user:secret@db.example:61234 during handshake";
  const clean = redact(leaked);
  assert.equal(clean.includes("falkors://"), false);
  assert.equal(clean.includes("secret"), false);
});

test("seed.cypher splits into statements", () => {
  const file = path.join(process.cwd(), "seed", "github-universe-demo", "seed.cypher");
  const statements = splitCypher(fs.readFileSync(file, "utf8"));
  assert.ok(statements.length > 40);
  assert.equal(statements.some((line) => line.startsWith("//")), false);
  assert.equal(statements.every((line) => !line.endsWith(";")), true);
});
