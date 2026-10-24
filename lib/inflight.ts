const inflight = new Map<string, Promise<unknown>>();

/** Share one in-flight promise per key so a second click does not start a second fetch. */
export function shareInflight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = Promise.resolve()
    .then(run)
    .finally(() => {
      if (inflight.get(key) === pending) inflight.delete(key);
    });
  inflight.set(key, pending);
  return pending;
}
