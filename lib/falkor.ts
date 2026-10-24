import { FalkorDB, type FalkorDBOptions } from "falkordb";
import { parseFalkorUrl, type FalkorEndpoint } from "./falkor-url";
import { logBackend, safeError } from "./redact";

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

let dbPromise: Promise<FalkorDB | null> | null = null;

export function getDb(): Promise<FalkorDB | null> {
  const raw = process.env.FALKORDB_URL;
  if (!raw) return Promise.resolve(null);
  if (!dbPromise) dbPromise = openDb(raw);
  return dbPromise;
}

async function openDb(raw: string): Promise<FalkorDB | null> {
  let endpoint: FalkorEndpoint;
  try {
    endpoint = parseFalkorUrl(raw);
  } catch {
    logBackend("memory", "FALKORDB_URL could not be parsed");
    return null;
  }
  const secrets = [endpoint.host, endpoint.username, endpoint.password];
  try {
    const db = await withTimeout(
      FalkorDB.connect(connectOptions(endpoint)),
      8000,
      "connection timed out",
    );
    logBackend("falkordb", endpoint.tls ? "connected over TLS" : "connected");
    return db;
  } catch (err) {
    logBackend("memory", `connection failed: ${safeError(err, secrets)}`);
    return null;
  }
}

function connectOptions(endpoint: FalkorEndpoint): FalkorDBOptions {
  const shared = {
    username: endpoint.username || undefined,
    password: endpoint.password || undefined,
  };
  if (endpoint.tls) {
    return {
      ...shared,
      socket: {
        host: endpoint.host,
        port: endpoint.port,
        tls: true,
        servername: endpoint.host,
        connectTimeout: 5000,
        reconnectStrategy: false,
      },
    };
  }
  return {
    ...shared,
    socket: {
      host: endpoint.host,
      port: endpoint.port,
      connectTimeout: 5000,
      reconnectStrategy: false,
    },
  };
}
