import { EventEmitter } from "events";
import { FalkorDB, type FalkorDBOptions } from "falkordb";
import { parseFalkorUrl, type FalkorEndpoint } from "./falkor-url";
import { logBackend, safeError } from "./redact";

export const RETRY_BACKOFF_MS = 2_000;

const CLOSED_RE =
  /closed|disconnect|ECONNRESET|ECONNREFUSED|EPIPE|EAI_AGAIN|socket|NR_CLOSED|connection/i;

export function graphName(): string {
  const raw = process.env.FALKOR_GRAPH || "copilot_seed";
  return /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : "copilot_seed";
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Short delay between reconnect attempts. Gives up so the next getDb can start clean. */
export function reconnectDelay(retries: number): number | false {
  if (retries > 6) return false;
  return Math.min(250 * (retries + 1), RETRY_BACKOFF_MS);
}

type ConnectFn = (raw: string) => Promise<FalkorDB | null>;

let connectFn: ConnectFn = defaultConnect;
let nowFn: () => number = () => Date.now();
let dbPromise: Promise<FalkorDB | null> | null = null;
let active: FalkorDB | null = null;
let retryNotBefore = 0;

export function getDb(): Promise<FalkorDB | null> {
  const raw = process.env.FALKORDB_URL;
  if (!raw) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  if (nowFn() < retryNotBefore) return Promise.resolve(null);
  let attempt: Promise<FalkorDB | null>;
  attempt = connectFn(raw).then((db) => {
    if (dbPromise !== attempt) {
      if (db) void closeQuiet(db);
      return null;
    }
    if (!db) {
      failAttempt();
      return null;
    }
    active = db;
    watchDisconnect(db);
    return db;
  });
  dbPromise = attempt;
  return attempt;
}

export function noteQueryFailure(err: unknown): void {
  if (!CLOSED_RE.test(safeError(err))) return;
  const db = active;
  if (!db) {
    dbPromise = null;
    retryNotBefore = nowFn() + RETRY_BACKOFF_MS;
    return;
  }
  forget(db);
}

export function resetFalkorForTests(hooks?: {
  connect?: ConnectFn;
  now?: () => number;
} | null): void {
  dbPromise = null;
  active = null;
  retryNotBefore = 0;
  connectFn = hooks?.connect ?? defaultConnect;
  nowFn = hooks?.now ?? (() => Date.now());
}

async function defaultConnect(raw: string): Promise<FalkorDB | null> {
  let endpoint: FalkorEndpoint;
  try {
    endpoint = parseFalkorUrl(raw);
  } catch {
    logBackend("memory", "FALKORDB_URL could not be parsed");
    return null;
  }
  const secrets = [endpoint.host, endpoint.username, endpoint.password];
  const connecting = FalkorDB.connect(connectOptions(endpoint));
  try {
    const db = await withTimeout(connecting, 8000, "connection timed out");
    logBackend("falkordb", endpoint.tls ? "connected over TLS" : "connected");
    return db;
  } catch (err) {
    logBackend("memory", `connection failed: ${safeError(err, secrets)}`);
    void connecting.then(
      (db) => closeQuiet(db),
      () => undefined,
    );
    return null;
  }
}

function failAttempt(): void {
  dbPromise = null;
  active = null;
  retryNotBefore = nowFn() + RETRY_BACKOFF_MS;
}

function forget(db: FalkorDB): void {
  if (active === db) active = null;
  dbPromise = null;
  retryNotBefore = nowFn() + RETRY_BACKOFF_MS;
  void closeQuiet(db);
}

function watchDisconnect(db: FalkorDB): void {
  const onEnd = () => {
    if (active !== db) return;
    logBackend("memory", "connection closed, will retry");
    forget(db);
  };
  if (db instanceof EventEmitter) db.on("end", onEnd);
  void db.connection
    .then((conn) => {
      conn.on("end", onEnd);
    })
    .catch(() => {
      if (active === db) forget(db);
    });
}

function closeQuiet(db: FalkorDB): void {
  void db.close().catch(() => undefined);
}

function connectOptions(endpoint: FalkorEndpoint): FalkorDBOptions {
  const shared = {
    username: endpoint.username || undefined,
    password: endpoint.password || undefined,
  };
  const socket = {
    host: endpoint.host,
    port: endpoint.port,
    connectTimeout: 5000,
    reconnectStrategy: reconnectDelay,
  };
  if (endpoint.tls) {
    return {
      ...shared,
      socket: {
        ...socket,
        tls: true,
        servername: endpoint.host,
      },
    };
  }
  return { ...shared, socket };
}
