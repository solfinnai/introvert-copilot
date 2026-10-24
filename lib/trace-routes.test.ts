import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { test } from "node:test";
import { SEED_FILE_GLOBS, seedTracingIncludes } from "./trace-routes";

test("file tracing includes every route that can read the seed", () => {
  const includes = seedTracingIncludes();
  const routes = discoverRoutes(path.join(process.cwd(), "app"));
  assert.ok(routes.includes("/saved"));
  assert.ok(routes.includes("/"));
  for (const route of routes) {
    assert.ok(includes[route], `missing tracing include for ${route}`);
    for (const glob of SEED_FILE_GLOBS) assert.ok(includes[route].includes(glob));
  }
});

function discoverRoutes(dir: string, prefix = ""): string[] {
  const routes: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      routes.push(...discoverRoutes(full, `${prefix}/${name}`));
      continue;
    }
    if (name === "page.tsx") routes.push(prefix || "/");
    if (name === "route.ts") routes.push(prefix);
  }
  return routes;
}
