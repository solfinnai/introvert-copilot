import assert from "node:assert/strict";
import { EventEmitter } from "events";
import { afterEach, test } from "node:test";
import { FalkorDB } from "falkordb";
import { getDb, noteQueryFailure, reconnectDelay, resetFalkorForTests, RETRY_BACKOFF_MS } from "./falkor";

const previousUrl = process.env.FALKORDB_URL;

afterEach(() => {
  resetFalkorForTests(null);
  if (previousUrl === undefined) delete process.env.FALKORDB_URL;
  else process.env.FALKORDB_URL = previousUrl;
});

test("reconnect delay is short and eventually stops", () => {
  const first = reconnectDelay(0);
  assert.equal(typeof first, "number");
  assert.ok((first as number) > 0);
  assert.ok((first as number) <= RETRY_BACKOFF_MS);
  assert.equal(reconnectDelay(100), false);
});

test("a failed connection is retried after a short backoff", async () => {
  let now = 10_000;
  let calls = 0;
  process.env.FALKORDB_URL = "falkor://localhost:6379";
  resetFalkorForTests({
    now: () => now,
    connect: async () => {
      calls += 1;
      return null;
    },
  });
  assert.equal(await getDb(), null);
  assert.equal(await getDb(), null);
  assert.equal(calls, 1);
  now += RETRY_BACKOFF_MS;
  assert.equal(await getDb(), null);
  assert.equal(calls, 2);
});

test("a closed client is replaced on the next attempt", async () => {
  let now = 20_000;
  const clients: FakeDb[] = [];
  process.env.FALKORDB_URL = "falkor://localhost:6379";
  resetFalkorForTests({
    now: () => now,
    connect: async () => {
      const db = new FakeDb();
      clients.push(db);
      return db as unknown as FalkorDB;
    },
  });
  const first = await getDb();
  await flush();
  assert.equal(clients.length, 1);
  clients[0].conn.emit("end");
  await flush();
  assert.equal(await getDb(), null);
  now += RETRY_BACKOFF_MS;
  const second = await getDb();
  assert.notEqual(second, first);
  assert.equal(clients.length, 2);
  assert.equal(clients[0].closed, true);
});

test("a query error on a live socket does not drop the client", async () => {
  let calls = 0;
  process.env.FALKORDB_URL = "falkor://localhost:6379";
  resetFalkorForTests({
    connect: async () => {
      calls += 1;
      return new FakeDb() as unknown as FalkorDB;
    },
  });
  const first = await getDb();
  noteQueryFailure(new Error("Invalid input"));
  const second = await getDb();
  assert.equal(second, first);
  assert.equal(calls, 1);
  noteQueryFailure(new Error("Socket closed unexpectedly"));
  assert.equal(await getDb(), null);
});

class FakeConn extends EventEmitter {
  isOpen = true;
}

class FakeDb extends EventEmitter {
  conn = new FakeConn();
  connection = Promise.resolve(this.conn);
  closed = false;
  selectGraph() {
    return this;
  }
  async close() {
    this.closed = true;
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
